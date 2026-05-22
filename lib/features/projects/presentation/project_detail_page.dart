import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';

class ProjectDetailPage extends StatefulWidget {
  final String id;
  const ProjectDetailPage({super.key, required this.id});

  @override
  State<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends State<ProjectDetailPage> {
  bool _loading = true;
  Project? _project;
  List<AppUser> _members = [];
  List<Map<String, dynamic>> _tasks = [];
  List<_PhotoItem> _photos = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait<dynamic>([
        client.from('projects').select().eq('id', widget.id).single(),
        client.from('project_members').select('user_id, users(id, full_name, specialty, role)').eq('project_id', widget.id),
        client.from('tasks').select('id, title, status, priority, due_date').eq('project_id', widget.id).order('created_at', ascending: false),
        client.from('project_photos').select('id, storage_path, caption, taken_at').eq('project_id', widget.id).order('taken_at', ascending: false),
      ]);
      final memberRows = results[1] as List;
      final photoRows = (results[3] as List).cast<Map<String, dynamic>>();

      // Récupère les URLs signées pour toutes les photos
      List<_PhotoItem> photos = [];
      if (photoRows.isNotEmpty) {
        final paths = photoRows.map((p) => p['storage_path'] as String).toList();
        try {
          final signedList = await client.storage.from('project-photos').createSignedUrls(paths, 3600);
          for (int i = 0; i < photoRows.length; i++) {
            photos.add(_PhotoItem(
              id: photoRows[i]['id'] as String,
              path: photoRows[i]['storage_path'] as String,
              caption: photoRows[i]['caption'] as String?,
              signedUrl: i < signedList.length ? (signedList[i].signedUrl ?? '') : '',
            ));
          }
        } catch (_) {
          photos = photoRows.map((p) => _PhotoItem(id: p['id'] as String, path: p['storage_path'] as String, caption: p['caption'] as String?, signedUrl: '')).toList();
        }
      }

      setState(() {
        _project = Project.fromJson(results[0] as Map<String, dynamic>);
        _members = memberRows
            .where((r) => r['users'] != null)
            .map((r) => AppUser.fromJson(r['users'] as Map<String, dynamic>))
            .toList();
        _tasks = (results[2] as List).cast<Map<String, dynamic>>();
        _photos = photos;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_project == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Chantier introuvable')));
    }
    final p = _project!;
    return Scaffold(
      appBar: AppBar(
        title: Text(p.name, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final updated = await context.push('/projects/${p.id}/edit', extra: p);
              if (updated == true) _load();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('Statut', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
                        ProjectStatusBadge(status: p.status),
                      ],
                    ),
                    const Divider(height: 24),
                    _InfoRow(icon: Icons.trending_up, label: 'Avancement', value: '${p.progressPct}%'),
                    if (p.address != null) _InfoRow(icon: Icons.location_on_outlined, label: 'Adresse', value: p.address!),
                    if (p.startDate != null) _InfoRow(icon: Icons.calendar_today_outlined, label: 'Début', value: p.startDate!),
                    if (p.endDate != null) _InfoRow(icon: Icons.event_outlined, label: 'Fin prévue', value: p.endDate!),
                  ],
                ),
              ),
            ),
            if (p.budget != null) ...[
              const SizedBox(height: 12),
              _BudgetCard(budget: p.budget!, spent: p.spent, cs: cs),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: p.progressPct / 100,
                      backgroundColor: const Color(0xFFE2E8F0),
                      minHeight: 10,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text('${p.progressPct}%', style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            if (p.description != null) ...[
              const SizedBox(height: 16),
              Text('Description', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Text(p.description!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
            ],
            // Photos
            const SizedBox(height: 20),
            _PhotosSection(photos: _photos, projectId: widget.id, onRefresh: _load),
            // Tâches
            const SizedBox(height: 20),
            _TasksSection(tasks: _tasks, projectId: widget.id, onRefresh: _load),
            const SizedBox(height: 20),
            // Équipe
            Text('Équipe (${_members.length})', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (_members.isEmpty)
              Text('Aucun membre assigné', style: TextStyle(color: cs.onSurfaceVariant))
            else
              ..._members.map((m) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: cs.primaryContainer,
                      child: Text(m.initials, style: TextStyle(color: cs.onPrimaryContainer, fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                    title: Text(m.fullName ?? 'Sans nom'),
                    subtitle: m.specialty != null ? Text(m.specialty!) : null,
                  )),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: cs.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          const Spacer(),
          Text(value, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  final double budget;
  final double spent;
  final ColorScheme cs;
  const _BudgetCard({required this.budget, required this.spent, required this.cs});

  @override
  Widget build(BuildContext context) {
    final pct = budget > 0 ? (spent / budget).clamp(0.0, 1.0) : 0.0;
    final over = spent > budget;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Budget', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_fmt(spent), style: TextStyle(fontWeight: FontWeight.bold, color: over ? const Color(0xFFDC2626) : cs.onSurface)),
                Text('/ ${_fmt(budget)}', style: TextStyle(color: cs.onSurfaceVariant)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct,
                backgroundColor: const Color(0xFFE2E8F0),
                color: over ? const Color(0xFFDC2626) : cs.primary,
                minHeight: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }
}

// ── Photo item data ──────────────────────────────────────────

class _PhotoItem {
  final String id;
  final String path;
  final String? caption;
  final String signedUrl;
  _PhotoItem({required this.id, required this.path, this.caption, required this.signedUrl});
}

// ── Section Photos ────────────────────────────────────────────

class _PhotosSection extends StatefulWidget {
  final List<_PhotoItem> photos;
  final String projectId;
  final VoidCallback onRefresh;
  const _PhotosSection({required this.photos, required this.projectId, required this.onRefresh});

  @override
  State<_PhotosSection> createState() => _PhotosSectionState();
}

class _PhotosSectionState extends State<_PhotosSection> {
  bool _uploading = false;
  final _picker = ImagePicker();

  Future<void> _pickAndUpload(ImageSource source) async {
    final file = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1920);
    if (file == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final ext = file.path.split('.').last;
      final path = '${widget.projectId}/${DateTime.now().millisecondsSinceEpoch}.$ext';
      final bytes = await file.readAsBytes();
      await Supabase.instance.client.storage.from('project-photos').uploadBinary(path, bytes,
        fileOptions: FileOptions(contentType: 'image/$ext', upsert: false));
      await Supabase.instance.client.from('project_photos').insert({
        'project_id': widget.projectId,
        'storage_path': path,
        'uploaded_by': uid,
        'source': 'mobile',
      });
      widget.onRefresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur upload: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _delete(_PhotoItem photo) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer la photo'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Supabase.instance.client.storage.from('project-photos').remove([photo.path]);
      await Supabase.instance.client.from('project_photos').delete().eq('id', photo.id);
      widget.onRefresh();
    } catch (_) {}
  }

  void _viewPhoto(_PhotoItem photo) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            InteractiveViewer(child: CachedNetworkImage(imageUrl: photo.signedUrl, fit: BoxFit.contain, width: double.infinity, height: double.infinity)),
            Positioned(top: 8, right: 8, child: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context))),
            if (photo.caption != null)
              Positioned(bottom: 16, left: 16, right: 16,
                child: Text(photo.caption!, style: const TextStyle(color: Colors.white, shadows: [Shadow(color: Colors.black, blurRadius: 4)]))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text('Photos (${widget.photos.length})', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600))),
            if (_uploading)
              const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            else
              PopupMenuButton<ImageSource>(
                icon: const Icon(Icons.add_a_photo_outlined, size: 20),
                itemBuilder: (_) => [
                  const PopupMenuItem(value: ImageSource.camera, child: Row(children: [Icon(Icons.camera_alt_outlined, size: 18), SizedBox(width: 8), Text('Prendre une photo')])),
                  const PopupMenuItem(value: ImageSource.gallery, child: Row(children: [Icon(Icons.photo_library_outlined, size: 18), SizedBox(width: 8), Text('Choisir depuis la galerie')])),
                ],
                onSelected: _pickAndUpload,
              ),
          ],
        ),
        if (widget.photos.isEmpty)
          Text('Aucune photo. Appuyez sur + pour en ajouter.', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13))
        else
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: widget.photos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final photo = widget.photos[i];
                return GestureDetector(
                  onTap: () => _viewPhoto(photo),
                  onLongPress: () => _delete(photo),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: photo.signedUrl.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: photo.signedUrl,
                            width: 100, height: 100,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => Container(width: 100, height: 100, color: const Color(0xFFE2E8F0)),
                            errorWidget: (_, __, ___) => Container(width: 100, height: 100, color: const Color(0xFFE2E8F0), child: const Icon(Icons.broken_image_outlined)),
                          )
                        : Container(width: 100, height: 100, color: const Color(0xFFE2E8F0), child: const Icon(Icons.image_outlined)),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}

// ── Section Tâches ───────────────────────────────────────────

class _TasksSection extends StatefulWidget {
  final List<Map<String, dynamic>> tasks;
  final String projectId;
  final VoidCallback onRefresh;
  const _TasksSection({required this.tasks, required this.projectId, required this.onRefresh});

  @override
  State<_TasksSection> createState() => _TasksSectionState();
}

class _TasksSectionState extends State<_TasksSection> {
  final _titleCtrl = TextEditingController();
  bool _showForm = false;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Future<void> _createTask() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('tasks').insert({
        'project_id': widget.projectId,
        'title': title,
        'status': 'todo',
        'priority': 'medium',
      });
      _titleCtrl.clear();
      setState(() { _showForm = false; _saving = false; });
      widget.onRefresh();
    } catch (_) {
      setState(() => _saving = false);
    }
  }

  Future<void> _toggleStatus(String taskId, String currentStatus) async {
    final newStatus = currentStatus == 'done' ? 'todo' : 'done';
    await Supabase.instance.client.from('tasks').update({'status': newStatus}).eq('id', taskId);
    widget.onRefresh();
  }

  String _priorityLabel(String p) => switch (p) { 'high' => 'Haute', 'low' => 'Faible', _ => 'Normale' };
  Color _priorityColor(String p) => switch (p) { 'high' => const Color(0xFFDC2626), 'low' => const Color(0xFF94A3B8), _ => const Color(0xFF2563EB) };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final done = widget.tasks.where((t) => t['status'] == 'done').length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Tâches (${widget.tasks.length}${widget.tasks.isNotEmpty ? ' — $done terminée${done > 1 ? 's' : ''}' : ''})',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
            IconButton(
              icon: Icon(_showForm ? Icons.close : Icons.add, size: 20),
              onPressed: () => setState(() => _showForm = !_showForm),
            ),
          ],
        ),
        if (_showForm) ...[
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _titleCtrl,
                  autofocus: true,
                  decoration: const InputDecoration(hintText: 'Titre de la tâche...', isDense: true),
                  onSubmitted: (_) => _createTask(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _saving ? null : _createTask,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                child: const Text('Ajouter'),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        if (widget.tasks.isEmpty && !_showForm)
          Text('Aucune tâche. Appuyez sur + pour en ajouter.', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13))
        else
          ...widget.tasks.map((task) {
            final isDone = task['status'] == 'done';
            final priority = task['priority'] as String? ?? 'medium';
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: GestureDetector(
                onTap: () => _toggleStatus(task['id'] as String, task['status'] as String),
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: isDone ? const Color(0xFF16A34A) : Colors.transparent,
                    border: Border.all(color: isDone ? const Color(0xFF16A34A) : cs.outline, width: 2),
                    shape: BoxShape.circle,
                  ),
                  child: isDone ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                ),
              ),
              title: Text(
                task['title'] as String,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  decoration: isDone ? TextDecoration.lineThrough : null,
                  color: isDone ? cs.onSurfaceVariant : null,
                ),
              ),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _priorityColor(priority).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(_priorityLabel(priority), style: TextStyle(fontSize: 10, color: _priorityColor(priority), fontWeight: FontWeight.w600)),
              ),
            );
          }),
      ],
    );
  }
}
