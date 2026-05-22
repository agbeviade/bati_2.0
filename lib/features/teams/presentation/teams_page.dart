import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/empty_state.dart';

class TeamsPage extends StatefulWidget {
  const TeamsPage({super.key});

  @override
  State<TeamsPage> createState() => _TeamsPageState();
}

class _TeamsPageState extends State<TeamsPage> {
  bool _loading = true;
  List<_TeamWithCount> _teams = [];

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
          return _TeamWithCount(team: team, memberCount: count);
        }).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Équipes')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _teams.isEmpty
                  ? const EmptyState(icon: Icons.groups_outlined, title: 'Aucune équipe', subtitle: 'Créez des équipes depuis la version web')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _teams.length,
                      itemBuilder: (_, i) {
                        final t = _teams[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            onTap: () => context.go('/teams/${t.team.id}/attendance'),
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                    child: Text(
                                      t.team.name.substring(0, 1).toUpperCase(),
                                      style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onPrimaryContainer),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(t.team.name, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                                        Text('${t.memberCount} membre${t.memberCount != 1 ? 's' : ''}',
                                            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.fingerprint, color: Color(0xFF2563EB)),
                                  const SizedBox(width: 4),
                                  Text('Pointage', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFF2563EB))),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

class _TeamWithCount {
  final Team team;
  final int memberCount;
  _TeamWithCount({required this.team, required this.memberCount});
}
