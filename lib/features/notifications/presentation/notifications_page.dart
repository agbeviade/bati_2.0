import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool _loading = true;
  List<_Alert> _alerts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final client = Supabase.instance.client;
    final uid = client.auth.currentUser?.id;
    if (uid == null) { setState(() => _loading = false); return; }

    try {
      final now = DateTime.now().toUtc().toIso8601String();
      final openThreshold = DateTime.now().subtract(const Duration(hours: 12)).toUtc().toIso8601String();

      final results = await Future.wait<dynamic>([
        client.from('invoices').select('id, invoice_number, amount, due_date').inFilter('status', ['sent', 'overdue']).lt('due_date', now),
        client.from('quotes').select('id, quote_number, client_name').eq('status', 'sent').lt('valid_until', now.substring(0, 10)),
        client.from('attendance').select('id, check_in').eq('user_id', uid).isFilter('check_out', null).lt('check_in', openThreshold),
      ]);

      final List<_Alert> alerts = [];

      // Factures en retard
      for (final inv in (results[0] as List)) {
        alerts.add(_Alert(
          level: _AlertLevel.urgent,
          icon: Icons.receipt_long,
          title: 'Facture ${inv['invoice_number']} en retard',
          subtitle: 'Échéance dépassée',
          route: '/invoices/${inv['id']}',
        ));
      }

      // Devis expirés
      for (final q in (results[1] as List)) {
        alerts.add(_Alert(
          level: _AlertLevel.warning,
          icon: Icons.description_outlined,
          title: 'Devis ${q['quote_number']} expiré',
          subtitle: q['client_name'] != null ? 'Client : ${q['client_name']}' : 'Renouveler ou relancer',
          route: '/quotes',
        ));
      }

      // Pointages ouverts > 12h
      for (final att in (results[2] as List)) {
        final checkIn = DateTime.parse(att['check_in'] as String).toLocal();
        alerts.add(_Alert(
          level: _AlertLevel.info,
          icon: Icons.access_time,
          title: 'Pointage ouvert ${timeago.format(checkIn, locale: 'fr')}',
          subtitle: 'Entrée le ${checkIn.day}/${checkIn.month} à ${checkIn.hour}:${checkIn.minute.toString().padLeft(2, '0')}',
          route: '/attendance',
        ));
      }

      setState(() {
        _alerts = alerts;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _alerts.isEmpty
                  ? const _EmptyNotifications()
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _SummaryCards(alerts: _alerts),
                        const SizedBox(height: 16),
                        ..._alerts.map((a) => _AlertTile(alert: a)),
                      ],
                    ),
            ),
    );
  }
}

class _SummaryCards extends StatelessWidget {
  final List<_Alert> alerts;
  const _SummaryCards({required this.alerts});

  @override
  Widget build(BuildContext context) {
    final urgent = alerts.where((a) => a.level == _AlertLevel.urgent).length;
    final warning = alerts.where((a) => a.level == _AlertLevel.warning).length;
    final info = alerts.where((a) => a.level == _AlertLevel.info).length;
    return Row(
      children: [
        if (urgent > 0) Expanded(child: _SummaryChip(label: 'Urgent', count: urgent, color: const Color(0xFFDC2626), bg: const Color(0xFFFEE2E2))),
        if (urgent > 0 && warning > 0) const SizedBox(width: 8),
        if (warning > 0) Expanded(child: _SummaryChip(label: 'Attention', count: warning, color: const Color(0xFFEA580C), bg: const Color(0xFFFFF7ED))),
        if ((urgent > 0 || warning > 0) && info > 0) const SizedBox(width: 8),
        if (info > 0) Expanded(child: _SummaryChip(label: 'Info', count: info, color: const Color(0xFF1D4ED8), bg: const Color(0xFFDBEAFE))),
      ],
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  final Color bg;
  const _SummaryChip({required this.label, required this.count, required this.color, required this.bg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
      child: Column(
        children: [
          Text('$count', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final _Alert alert;
  const _AlertTile({required this.alert});

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (alert.level) {
      _AlertLevel.urgent => (const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
      _AlertLevel.warning => (const Color(0xFFFFF7ED), const Color(0xFFEA580C)),
      _AlertLevel.info => (const Color(0xFFDBEAFE), const Color(0xFF1D4ED8)),
    };
    return GestureDetector(
      onTap: alert.route != null ? () => context.push(alert.route!) : null,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            Icon(alert.icon, color: fg, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(alert.title, style: TextStyle(fontWeight: FontWeight.w600, color: fg, fontSize: 13)),
                  Text(alert.subtitle, style: TextStyle(color: fg.withValues(alpha: 0.8), fontSize: 12)),
                ],
              ),
            ),
            if (alert.route != null) Icon(Icons.chevron_right, color: fg, size: 18),
          ],
        ),
      ),
    );
  }
}

class _EmptyNotifications extends StatelessWidget {
  const _EmptyNotifications();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: const Color(0xFFDCFCE7), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle_outline, size: 48, color: Color(0xFF16A34A)),
            ),
            const SizedBox(height: 16),
            Text('Tout est en ordre !', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text('Aucune alerte en ce moment', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

enum _AlertLevel { urgent, warning, info }

class _Alert {
  final _AlertLevel level;
  final IconData icon;
  final String title;
  final String subtitle;
  final String? route;
  const _Alert({required this.level, required this.icon, required this.title, required this.subtitle, this.route});
}
