import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../core/theme/app_theme.dart';

const _kRoleLabels = {
  'admin': 'Admin',
  'manager': 'Manager',
  'foreman': 'Chef chantier',
  'worker': 'Ouvrier',
  'super_admin': 'Super Admin',
};

class TeamDetailPage extends StatefulWidget {
  final String id;
  const TeamDetailPage({super.key, required this.id});

  @override
  State<TeamDetailPage> createState() => _TeamDetailPageState();
}

class _TeamDetailPageState extends State<TeamDetailPage> {
  bool _loading = true;
  Team? _team;
  List<Map<String, dynamic>> _members = [];

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
        client.from('teams').select().eq('id', widget.id).single(),
        client
            .from('team_members')
            .select('user_id, users(id, full_name, role, is_active)')
            .eq('team_id', widget.id),
      ]);
      setState(() {
        _team = Team.fromJson(results[0] as Map<String, dynamic>);
        _members = (results[1] as List)
            .cast<Map<String, dynamic>>()
            .where((m) => m['users'] != null)
            .toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _removeMember(String userId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Retirer ce membre ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Retirer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await Supabase.instance.client
          .from('team_members')
          .delete()
          .eq('team_id', widget.id)
          .eq('user_id', userId);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _setLead(String userId) async {
    try {
      await Supabase.instance.client
          .from('teams')
          .update({'lead_id': userId})
          .eq('id', widget.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _addMember() async {
    // Load available company users not already in team
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;
      final data = await Supabase.instance.client
          .from('users')
          .select('id, full_name, role')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .neq('role', 'client')
          .order('full_name');

      final currentIds = _members.map((m) => m['user_id'] as String).toSet();
      final available = (data as List)
          .cast<Map<String, dynamic>>()
          .where((u) => !currentIds.contains(u['id']))
          .toList();

      if (!mounted) return;

      if (available.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tous les membres de la company sont déjà dans l\'équipe')),
        );
        return;
      }

      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (_, scrollController) => Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    Text('Ajouter un membre',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: available.length,
                  itemBuilder: (_, i) {
                    final u = available[i];
                    final name = u['full_name'] as String? ?? 'Sans nom';
                    final role = _kRoleLabels[u['role'] as String? ?? 'worker'] ?? 'Ouvrier';
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: TextStyle(
                              color: AppColors.primary, fontWeight: FontWeight.bold),
                        ),
                      ),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Text(role),
                      onTap: () async {
                        Navigator.pop(ctx);
                        try {
                          await Supabase.instance.client.from('team_members').insert({
                            'team_id': widget.id,
                            'user_id': u['id'] as String,
                          });
                          _load();
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                  content: Text('Erreur : $e'),
                                  backgroundColor: AppColors.red),
                            );
                          }
                        }
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _deleteTeam() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer l\'équipe ?'),
        content: const Text('Cette action est irréversible. Les membres seront retirés.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await Supabase.instance.client.from('teams').delete().eq('id', widget.id);
      if (mounted) context.pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_team == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Équipe introuvable')));
    }
    final team = _team!;

    return Scaffold(
      appBar: AppBar(
        title: Text(team.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Modifier',
            onPressed: () async {
              final result = await context.push('/teams/${widget.id}/edit', extra: team);
              if (result == true) _load();
            },
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'attendance') context.push('/teams/${widget.id}/attendance');
              if (v == 'delete') _deleteTeam();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'attendance',
                child: ListTile(
                    leading: Icon(Icons.fingerprint_outlined),
                    title: Text('Pointage'),
                    dense: true),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: ListTile(
                    leading: Icon(Icons.delete_outline, color: Colors.red),
                    title: Text('Supprimer', style: TextStyle(color: Colors.red)),
                    dense: true),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Stats card ─────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${_members.length} membre${_members.length != 1 ? 's' : ''}',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.bold)),
                          if (team.leadId != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Chef : ${_members.firstWhere((m) => m['user_id'] == team.leadId, orElse: () => {'users': null})['users']?['full_name'] ?? 'Non défini'}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: cs.onSurfaceVariant),
                            ),
                          ],
                        ],
                      ),
                    ),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.fingerprint_outlined, size: 16),
                      label: const Text('Pointage'),
                      onPressed: () => context.push('/teams/${widget.id}/attendance'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ── Members section ────────────────────────────────
            Row(
              children: [
                Text('Membres',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const Spacer(),
                TextButton.icon(
                  icon: const Icon(Icons.person_add_outlined, size: 16),
                  label: const Text('Ajouter'),
                  onPressed: _addMember,
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_members.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                      'Aucun membre dans cette équipe.\nAjoutez des membres avec le bouton ci-dessus.',
                      textAlign: TextAlign.center,
                      style:
                          TextStyle(color: cs.onSurfaceVariant, fontSize: 13),
                    ),
                  ),
                ),
              )
            else
              Card(
                child: Column(
                  children: _members.map((m) {
                    final u = m['users'] as Map<String, dynamic>? ?? {};
                    final userId = m['user_id'] as String;
                    final name = u['full_name'] as String? ?? 'Sans nom';
                    final role = _kRoleLabels[u['role'] as String? ?? 'worker'] ?? 'Ouvrier';
                    final isLead = team.leadId == userId;

                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: isLead
                            ? AppColors.amber.withValues(alpha: 0.2)
                            : AppColors.primary.withValues(alpha: 0.1),
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: TextStyle(
                            color: isLead ? AppColors.amber : AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      title: Text(name,
                          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                      subtitle: Text(role, style: const TextStyle(fontSize: 12)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isLead)
                            Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.amber.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text('Chef',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.amber)),
                            ),
                          PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'lead') _setLead(userId);
                              if (v == 'remove') _removeMember(userId);
                            },
                            itemBuilder: (_) => [
                              if (!isLead)
                                const PopupMenuItem(
                                  value: 'lead',
                                  child: ListTile(
                                    leading: Icon(Icons.star_outline),
                                    title: Text('Désigner chef'),
                                    dense: true,
                                  ),
                                ),
                              const PopupMenuItem(
                                value: 'remove',
                                child: ListTile(
                                  leading: Icon(Icons.person_remove_outlined,
                                      color: Colors.red),
                                  title: Text('Retirer',
                                      style: TextStyle(color: Colors.red)),
                                  dense: true,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
