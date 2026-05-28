import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/json_cache.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';

class ProjectsPage extends StatefulWidget {
  const ProjectsPage({super.key});

  @override
  State<ProjectsPage> createState() => _ProjectsPageState();
}

const _kPageSize = 20;

class _ProjectsPageState extends State<ProjectsPage> {
  static const _cacheKey = 'projects_v1';

  bool _loading = true;
  List<Project> _projects = [];
  ProjectStatus? _filter;
  int _displayCount = _kPageSize;

  @override
  void initState() {
    super.initState();
    _hydrateFromCache();
    _refresh();
  }

  /// Cache stocke la liste complète. Le filtre statut est appliqué
  /// client-side via `_filteredProjects` — plus de re-fetch à chaque
  /// changement de filtre, et le cache reste valide pour tous les filtres.
  void _hydrateFromCache() {
    final entry = JsonCache.instance.read(_cacheKey);
    if (entry == null) return;
    try {
      final list = (entry.data as List).cast<Map<String, dynamic>>();
      setState(() {
        _projects = list.map(Project.fromJson).toList();
        _loading = false;
      });
    } catch (_) {}
  }

  Future<void> _refresh() async {
    try {
      final data = await Supabase.instance.client
          .from('projects')
          .select()
          .order('created_at', ascending: false);
      final jsonList = (data as List).cast<Map<String, dynamic>>();
      await JsonCache.instance.write(_cacheKey, jsonList);
      if (!mounted) return;
      setState(() {
        _projects = jsonList.map(Project.fromJson).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Project> get _filteredProjects {
    if (_filter == null) return _projects;
    return _projects.where((p) => p.status == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chantiers'),
        actions: [
          PopupMenuButton<ProjectStatus?>(
            icon: const Icon(Icons.filter_list),
            onSelected: (v) {
              // Plus de re-fetch — le filtre s'applique en mémoire via
              // `_filteredProjects`. Reset la pagination.
              setState(() { _filter = v; _displayCount = _kPageSize; });
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('Tous')),
              const PopupMenuItem(value: ProjectStatus.planned, child: Text('Planifiés')),
              const PopupMenuItem(value: ProjectStatus.inProgress, child: Text('En cours')),
              const PopupMenuItem(value: ProjectStatus.paused, child: Text('Pausés')),
              const PopupMenuItem(value: ProjectStatus.completed, child: Text('Terminés')),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await context.push('/projects/new');
          if (created == true) _refresh();
        },
        icon: const Icon(Icons.add),
        label: const Text('Nouveau chantier'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refresh,
              child: _filteredProjects.isEmpty
                  ? EmptyState(
                      icon: Icons.construction_outlined,
                      title: _filter == null ? 'Aucun chantier' : 'Aucun chantier dans ce filtre',
                      subtitle: _filter == null ? 'Créez votre premier chantier' : 'Changez de filtre ou créez-en un nouveau',
                      actionLabel: 'Créer un chantier',
                      onAction: () async {
                        final created = await context.push('/projects/new');
                        if (created == true) _refresh();
                      },
                    )
                  : Builder(builder: (_) {
                        final filtered = _filteredProjects;
                        final displayed = filtered.take(_displayCount).toList();
                        final hasMore = displayed.length < filtered.length;
                        return ListView.builder(
                          padding: EdgeInsets.fromLTRB(16, 16, 16, hasMore ? 8 : 100),
                          itemCount: displayed.length + (hasMore ? 1 : 0),
                          itemBuilder: (_, i) {
                            if (i == displayed.length) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 100),
                                child: OutlinedButton(
                                  onPressed: () => setState(() => _displayCount += _kPageSize),
                                  child: Text('Afficher plus (${filtered.length - displayed.length} restants)'),
                                ),
                              );
                            }
                            return _ProjectTile(project: displayed[i]);
                          },
                        );
                      }),
            ),
    );
  }
}

class _ProjectTile extends StatelessWidget {
  final Project project;
  const _ProjectTile({required this.project});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => context.go('/projects/${project.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(project.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  ),
                  ProjectStatusBadge(status: project.status),
                ],
              ),
              if (project.address != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 14, color: cs.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Expanded(child: Text(project.address!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: project.progressPct / 100,
                            backgroundColor: const Color(0xFFE2E8F0),
                            minHeight: 6,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text('Avancement : ${project.progressPct}%', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  if (project.budget != null) ...[
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(_fmt(project.spent), style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                        Text('/ ${_fmt(project.budget!)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                      ],
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) { final m = v / 1000000; return '${m == m.roundToDouble() ? m.toStringAsFixed(0) : m.toStringAsFixed(1)}M'; }
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }
}
