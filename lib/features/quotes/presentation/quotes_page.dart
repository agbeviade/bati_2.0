import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';

class QuotesPage extends StatefulWidget {
  const QuotesPage({super.key});

  @override
  State<QuotesPage> createState() => _QuotesPageState();
}

class _QuotesPageState extends State<QuotesPage> {
  bool _loading = true;
  List<Quote> _quotes = [];
  QuoteStatus? _filter;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client
          .from('quotes')
          .select()
          .order('created_at', ascending: false);
      setState(() {
        _quotes = (data as List).map((j) => Quote.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<Quote> get _filtered =>
      _filter == null ? _quotes : _quotes.where((q) => q.status == _filter).toList();

  double get _totalApproved => _quotes
      .where((q) => q.status == QuoteStatus.approved)
      .fold(0, (s, q) => s + q.total);

  int _count(QuoteStatus s) => _quotes.where((q) => q.status == s).length;

  String _fmtShort(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final visible = _filtered;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              title: const Text('Devis'),
              floating: true,
              snap: true,
              actions: [
                IconButton(
                  icon: const Icon(Icons.auto_awesome),
                  tooltip: 'Devis IA',
                  onPressed: () => context.go('/quotes/ai'),
                ),
              ],
            ),
            if (!_loading) ...[
              // ── Stats ──────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Column(
                    children: [
                      // Hero card — total approuvé
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: AppColors.gradientGreen,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Devis approuvés',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: Colors.white70)),
                                  Text('${_fmtShort(_totalApproved)} XOF',
                                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                          color: Colors.white, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                            const Icon(Icons.check_circle_outline, color: Colors.white54, size: 40),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      // Mini stats
                      Row(
                        children: [
                          _StatChip(label: 'Brouillons', count: _count(QuoteStatus.draft), color: cs.onSurfaceVariant),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Envoyés', count: _count(QuoteStatus.sent), color: Colors.blue),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Approuvés', count: _count(QuoteStatus.approved), color: Colors.green),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Refusés', count: _count(QuoteStatus.rejected), color: AppColors.red),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // Filter chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            FilterChip(
                              label: const Text('Tous'),
                              selected: _filter == null,
                              onSelected: (_) => setState(() => _filter = null),
                            ),
                            const SizedBox(width: 8),
                            ...QuoteStatus.values.map((s) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: FilterChip(
                                    label: Text(_statusLabel(s)),
                                    selected: _filter == s,
                                    onSelected: (_) => setState(() => _filter = _filter == s ? null : s),
                                  ),
                                )),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // ── List ───────────────────────────────────────────
              if (visible.isEmpty)
                SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.description_outlined,
                    title: 'Aucun devis',
                    subtitle: _filter != null ? 'Aucun devis avec ce statut' : 'Créez votre premier devis',
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => _QuoteTile(quote: visible[i]),
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
        icon: const Icon(Icons.add),
        label: const Text('Nouveau devis'),
        onPressed: () async {
          final result = await context.push('/quotes/new');
          if (result == true) _load();
        },
      ),
    );
  }

  String _statusLabel(QuoteStatus s) => switch (s) {
        QuoteStatus.draft => 'Brouillon',
        QuoteStatus.sent => 'Envoyé',
        QuoteStatus.approved => 'Approuvé',
        QuoteStatus.rejected => 'Refusé',
        QuoteStatus.expired => 'Expiré',
      };
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _StatChip({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text('$count',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold, color: color)),
            Text(label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _QuoteTile extends StatelessWidget {
  final Quote quote;
  const _QuoteTile({required this.quote});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final q = quote;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/quotes/${q.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                      child: Text(q.quoteNumber,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant, fontFamily: 'monospace'))),
                  QuoteStatusBadge(status: q.status),
                ],
              ),
              const SizedBox(height: 4),
              if (q.clientName != null)
                Text(q.clientName!,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              if (q.projectType != null) ...[
                const SizedBox(height: 2),
                Text(q.projectType!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
              ],
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_fmt(q.total),
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold, color: cs.primary)),
                  if (q.validUntil != null)
                    Text('Val. ${q.validUntil}',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            ],
          ),
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
