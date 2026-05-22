import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';

class PortalQuotesPage extends StatefulWidget {
  const PortalQuotesPage({super.key});

  @override
  State<PortalQuotesPage> createState() => _PortalQuotesPageState();
}

class _PortalQuotesPageState extends State<PortalQuotesPage> {
  bool _loading = true;
  List<Quote> _quotes = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) return;
      final data = await Supabase.instance.client
          .from('quotes')
          .select()
          .eq('client_id', uid)
          .order('created_at', ascending: false);
      setState(() {
        _quotes = (data as List).map((j) => Quote.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes devis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Déconnexion',
            onPressed: () async => await Supabase.instance.client.auth.signOut(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _quotes.isEmpty
                  ? const EmptyState(icon: Icons.description_outlined, title: 'Aucun devis', subtitle: 'Vos devis apparaîtront ici')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _quotes.length,
                      itemBuilder: (_, i) {
                        final q = _quotes[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => context.go('/quotes/${q.id}'),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text(q.quoteNumber, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant, fontFamily: 'monospace'))),
                                      QuoteStatusBadge(status: q.status),
                                    ],
                                  ),
                                  if (q.projectType != null) ...[
                                    const SizedBox(height: 4),
                                    Text(q.projectType!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                                  ],
                                  const SizedBox(height: 8),
                                  Text(_fmt(q.total), style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: cs.primary)),
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
