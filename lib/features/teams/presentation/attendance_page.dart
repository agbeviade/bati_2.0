import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/queue/sync_queue.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';

class AttendancePage extends StatefulWidget {
  final String? teamId;
  const AttendancePage({super.key, this.teamId});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  bool _loading = true;
  bool _actionLoading = false;
  Attendance? _openAttendance;
  List<Attendance> _history = [];
  List<Map<String, dynamic>> _projects = [];
  String? _selectedProjectId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id;
    if (userId == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final results = await Future.wait([
        client.from('attendance').select().eq('user_id', userId).isFilter('check_out', null).maybeSingle(),
        client.from('attendance').select().eq('user_id', userId).not('check_out', 'is', null).order('check_in', ascending: false).limit(20),
        client.from('projects').select('id, name').inFilter('status', ['in_progress', 'planned']).order('name'),
      ]);
      setState(() {
        final openData = results[0] as Map<String, dynamic>?;
        _openAttendance = openData != null ? Attendance.fromJson(openData) : null;
        _history = (results[1] as List).map((j) => Attendance.fromJson(j)).toList();
        _projects = (results[2] as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<Position?> _getLocation() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.deniedForever || perm == LocationPermission.denied) {
      return null;
    }
    return Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
  }

  /// Pointage d'entrée. Si le réseau échoue, l'op est enqueuée et sera
  /// rejouée par le `SyncWorker` au retour en ligne.
  Future<void> _checkIn() async {
    setState(() => _actionLoading = true);
    try {
      final pos = await _getLocation();
      final client = Supabase.instance.client;
      final userId = client.auth.currentUser!.id;
      final payload = <String, dynamic>{
        'user_id': userId,
        'project_id': _selectedProjectId,
        'check_in': DateTime.now().toUtc().toIso8601String(),
        if (pos != null) 'geo_lat_in': pos.latitude,
        if (pos != null) 'geo_lng_in': pos.longitude,
      };

      try {
        await client.from('attendance').insert(payload);
        await _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Pointage d\'entrée enregistré')),
          );
        }
      } catch (_) {
        // Probable hors-ligne : enqueue, l'op partira au retour réseau.
        await SyncQueue.instance.enqueue(PendingOp(
          id: 'checkin-${DateTime.now().microsecondsSinceEpoch}',
          kind: 'attendance_checkin',
          payload: payload,
          createdAt: DateTime.now(),
        ));
        // Mise à jour optimiste de l'UI (utile à l'utilisateur sur chantier)
        if (mounted) {
          setState(() {
            _openAttendance = Attendance(
              id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
              userId: userId,
              projectId: _selectedProjectId,
              checkIn: DateTime.parse(payload['check_in'] as String),
              checkOut: null,
              hoursWorked: null,
              geoLatIn: pos?.latitude,
              geoLngIn: pos?.longitude,
              geoLatOut: null,
              geoLngOut: null,
            );
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Pointage sauvegardé localement — sync au retour réseau'),
              backgroundColor: AppColors.amber,
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  /// Pointage de sortie. Même logique offline-safe que `_checkIn`.
  Future<void> _checkOut() async {
    if (_openAttendance == null) return;
    setState(() => _actionLoading = true);
    try {
      final pos = await _getLocation();
      final now = DateTime.now().toUtc();
      final hours = now.difference(_openAttendance!.checkIn).inMinutes / 60.0;
      final update = <String, dynamic>{
        'check_out': now.toIso8601String(),
        'hours_worked': double.parse(hours.toStringAsFixed(2)),
        if (pos != null) 'geo_lat_out': pos.latitude,
        if (pos != null) 'geo_lng_out': pos.longitude,
      };

      try {
        await Supabase.instance.client
            .from('attendance')
            .update(update)
            .eq('id', _openAttendance!.id);
        await _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Pointage de sortie enregistré')),
          );
        }
      } catch (_) {
        // Hors-ligne : enqueue update. Note : si _openAttendance était lui-même
        // une op pending (id qui commence par 'pending-'), on update l'op
        // checkin déjà queued pour y ajouter le checkout — sinon on enqueue
        // un update normal.
        if (_openAttendance!.id.startsWith('pending-')) {
          // Combiner checkin + checkout dans la même op (le serveur recevra
          // une attendance déjà complète).
          final pendingCheckIns = SyncQueue.instance.byKind('attendance_checkin');
          if (pendingCheckIns.isNotEmpty) {
            final last = pendingCheckIns.last;
            await SyncQueue.instance.update(PendingOp(
              id: last.id,
              kind: last.kind,
              payload: {...last.payload, ...update},
              createdAt: last.createdAt,
            ));
          }
        } else {
          await SyncQueue.instance.enqueue(PendingOp(
            id: 'checkout-${DateTime.now().microsecondsSinceEpoch}',
            kind: 'attendance_checkout',
            payload: {'_attendance_id': _openAttendance!.id, ...update},
            createdAt: DateTime.now(),
          ));
        }

        if (mounted) {
          setState(() => _openAttendance = null);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Sortie sauvegardée localement — sync au retour réseau'),
              backgroundColor: AppColors.amber,
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  String _duration(Attendance a) {
    final end = a.checkOut ?? DateTime.now();
    final diff = end.difference(a.checkIn);
    final h = diff.inHours;
    final m = diff.inMinutes % 60;
    return '${h}h${m.toString().padLeft(2, '0')}';
  }

  String _timeStr(DateTime dt) {
    final local = dt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  String _dateStr(DateTime dt) {
    final local = dt.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isCheckedIn = _openAttendance != null;

    return Scaffold(
      appBar: AppBar(title: Text(widget.teamId != null ? 'Pointage équipe' : 'Mon pointage')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildStatusCard(cs, isCheckedIn),
                  const SizedBox(height: 20),
                  Text('Historique', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (_history.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text('Aucun pointage enregistré', style: TextStyle(color: cs.onSurfaceVariant)),
                    )
                  else
                    ..._history.map((a) => _HistoryTile(attendance: a, dateStr: _dateStr, timeStr: _timeStr, duration: _duration)),
                ],
              ),
            ),
    );
  }

  Widget _buildStatusCard(ColorScheme cs, bool isCheckedIn) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: isCheckedIn ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isCheckedIn ? Icons.login : Icons.logout,
                size: 36,
                color: isCheckedIn ? const Color(0xFF16A34A) : cs.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              isCheckedIn ? 'Pointé depuis ${_duration(_openAttendance!)}' : 'Non pointé',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            if (isCheckedIn) ...[
              const SizedBox(height: 4),
              Text(
                'Entrée à ${_timeStr(_openAttendance!.checkIn)} le ${_dateStr(_openAttendance!.checkIn)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
              ),
              if (_openAttendance!.geoLatIn != null) ...[
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.location_on, size: 14, color: cs.primary),
                    const SizedBox(width: 4),
                    Text('Position GPS enregistrée', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.primary)),
                  ],
                ),
              ],
            ],
            if (!isCheckedIn) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _selectedProjectId,
                decoration: const InputDecoration(labelText: 'Chantier (optionnel)', isDense: true),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Aucun')),
                  ..._projects.map((p) => DropdownMenuItem(value: p['id'] as String, child: Text(p['name'] as String))),
                ],
                onChanged: (v) => setState(() => _selectedProjectId = v),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _actionLoading ? null : (isCheckedIn ? _checkOut : _checkIn),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCheckedIn ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: _actionLoading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Icon(isCheckedIn ? Icons.logout : Icons.login, color: Colors.white),
                label: Text(
                  isCheckedIn ? 'Pointer la sortie' : 'Pointer l\'entrée',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final Attendance attendance;
  final String Function(DateTime) dateStr;
  final String Function(DateTime) timeStr;
  final String Function(Attendance) duration;

  const _HistoryTile({required this.attendance, required this.dateStr, required this.timeStr, required this.duration});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final a = attendance;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: cs.primaryContainer, shape: BoxShape.circle),
              child: Icon(Icons.access_time, size: 18, color: cs.onPrimaryContainer),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(dateStr(a.checkIn), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                  Text(
                    a.checkOut != null
                        ? '${timeStr(a.checkIn)} → ${timeStr(a.checkOut!)}'
                        : '${timeStr(a.checkIn)} → en cours',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: a.checkOut != null ? const Color(0xFFDBEAFE) : const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                duration(a),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: a.checkOut != null ? const Color(0xFF1D4ED8) : const Color(0xFF166534),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
