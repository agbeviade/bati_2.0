import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';

class TeamsPage extends StatefulWidget {
  const TeamsPage({super.key});

  @override
  State<TeamsPage> createState() => _TeamsPageState();
}

class _TeamsPageState extends State<TeamsPage> {
  bool _loading = true;
  List<_TeamRow> _teams = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client
          .from('teams')
          .select('id, name, lead_id, team_members(count)')
          .order('name');
      setState(() {
        _teams = (data as List).map((j) {
          final team = Team.fromJson(j);
          final count = (j['team_members'] as List?)?.firstOrNull?['count'] as int? ?? 0;
          return _TeamRow(team: team, memberCount: count);
        }).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Équipes')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _teams.isEmpty
                  ? const EmptyState(
                      icon: Icons.groups_outlined,
                      title: 'Aucune équipe',
                      subtitle: 'Créez votre première équipe',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                      itemCount: _teams.length,
                      itemBuilder: (_, i) {
                        final t = _teams[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            onTap: () async {
                              await context.push('/teams/${t.team.id}');
                              _load();
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 22,
                                    backgroundColor: AppColors.cyan.withValues(alpha: 0.15),
                                    child: Text(
                                      t.team.name[0].toUpperCase(),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.cyan,
                                          fontSize: 16),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          t.team.name,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodyMedium
                                              ?.copyWith(fontWeight: FontWeight.w600),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${t.memberCount} membre${t.memberCount != 1 ? 's' : ''}',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(color: cs.onSurfaceVariant),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // Quick access to attendance
                                  OutlinedButton.icon(
                                    icon: const Icon(Icons.fingerprint, size: 14),
                                    label: const Text('Pointage',
                                        style: TextStyle(fontSize: 12)),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 6),
                                      side: BorderSide(
                                          color: AppColors.primary.withValues(alpha: 0.4)),
                                    ),
                                    onPressed: () =>
                                        context.push('/teams/${t.team.id}/attendance'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.group_add_outlined),
        label: const Text('Nouvelle équipe'),
        onPressed: () async {
          final router = GoRouter.of(context);
          final result = await context.push('/teams/new');
          if (result != null) _load();
          if (!mounted || result is! String) return;
          router.push('/teams/$result');
        },
      ),
    );
  }
}

class _TeamRow {
  final Team team;
  final int memberCount;
  _TeamRow({required this.team, required this.memberCount});
}
