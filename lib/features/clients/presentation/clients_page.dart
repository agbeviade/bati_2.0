import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/json_cache.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/empty_state.dart';

class ClientsPage extends StatefulWidget {
  const ClientsPage({super.key});

  @override
  State<ClientsPage> createState() => _ClientsPageState();
}

class _ClientsPageState extends State<ClientsPage> {
  static const _cacheKey = 'clients_v1';

  bool _loading = true;
  List<AppUser> _clients = [];
  bool _showInactive = false;

  @override
  void initState() {
    super.initState();
    _hydrateFromCache();
    _refresh();
  }

  void _hydrateFromCache() {
    final entry = JsonCache.instance.read(_cacheKey);
    if (entry == null) return;
    try {
      final list = (entry.data as List).cast<Map<String, dynamic>>();
      setState(() {
        _clients = list.map(AppUser.fromJson).toList();
        _loading = false;
      });
    } catch (_) {}
  }

  Future<void> _refresh() async {
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
          .select()
          .eq('company_id', companyId)
          .eq('role', 'client')
          .order('full_name');
      final jsonList = (data as List).cast<Map<String, dynamic>>();
      await JsonCache.instance.write(_cacheKey, jsonList);
      if (!mounted) return;
      setState(() {
        _clients = jsonList.map(AppUser.fromJson).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<AppUser> get _filtered =>
      _showInactive ? _clients : _clients.where((c) => c.isActive).toList();

  @override
  Widget build(BuildContext context) {
    final active = _clients.where((c) => c.isActive).length;
    final visible = _filtered;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              title: const Text('Clients'),
              floating: true,
              snap: true,
            ),
            if (!_loading) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Column(
                    children: [
                      // Hero card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: AppColors.gradientHero,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Clients actifs',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: Colors.white70)),
                                  Text('$active',
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineMedium
                                          ?.copyWith(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold)),
                                  if (_clients.length > active)
                                    Text(
                                        '${_clients.length - active} inactif${_clients.length - active > 1 ? 's' : ''}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(color: Colors.white60)),
                                ],
                              ),
                            ),
                            const Icon(Icons.people_outline, color: Colors.white54, size: 48),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      // Filter toggle
                      Row(
                        children: [
                          FilterChip(
                            label: const Text('Actifs seulement'),
                            selected: !_showInactive,
                            onSelected: (_) => setState(() => _showInactive = false),
                          ),
                          const SizedBox(width: 8),
                          FilterChip(
                            label: const Text('Tous'),
                            selected: _showInactive,
                            onSelected: (_) => setState(() => _showInactive = true),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (visible.isEmpty)
                SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.person_outline,
                    title: 'Aucun client',
                    subtitle: _clients.isEmpty
                        ? 'Ajoutez votre premier client'
                        : 'Aucun client actif',
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => _ClientTile(
                        client: visible[i],
                        onTap: () async {
                          await context.push('/clients/${visible[i].id}');
                          _refresh();
                        },
                      ),
                      childCount: visible.length,
                    ),
                  ),
                ),
            ] else
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('Nouveau client'),
        onPressed: () async {
          final result = await context.push('/clients/new');
          if (result == true) _refresh();
        },
      ),
    );
  }
}

class _ClientTile extends StatelessWidget {
  final AppUser client;
  final VoidCallback onTap;
  const _ClientTile({required this.client, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                child: Text(
                  client.initials,
                  style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 14),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      client.fullName ?? 'Sans nom',
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (client.email != null) ...[
                      const SizedBox(height: 2),
                      Text(client.email!,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant)),
                    ],
                    if (client.phone != null) ...[
                      const SizedBox(height: 2),
                      Text(client.phone!,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant)),
                    ],
                  ],
                ),
              ),
              if (!client.isActive)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: cs.onSurface.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('Inactif',
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall
                          ?.copyWith(color: cs.onSurfaceVariant)),
                )
              else
                Icon(Icons.chevron_right, color: cs.onSurfaceVariant, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
