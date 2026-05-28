import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';
import '../data/quotes_provider.dart';

const _kPageSize = 20;

class QuotesPage extends ConsumerStatefulWidget {
  const QuotesPage({super.key});

  @override
  ConsumerState<QuotesPage> createState() => _QuotesPageState();
}

class _QuotesPageState extends ConsumerState<QuotesPage> {
  QuoteStatus? _filter;
  int _displayCount = _kPageSize;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(quotesProvider.notifier).load();
    });
  }

  List<Quote> _filtered(List<Quote> all) =>
      _filter == null ? all : all.where((q) => q.status == _filter).toList();

  String _fmtShort(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final state = ref.watch(quotesProvider);
    final allItems = state.items;
    final visible = _filtered(allItems);
    final displayed = visible.take(_displayCount).toList();
    final hasMore = displayed.length < visible.length;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.read(quotesProvider.notifier).load(),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              title: const Text('Devis'),
              floating: true,
              snap: true,
              actions: [
                IconButton(
                  icon: const Icon(Icons.folder_outlined),
                  tooltip: 'Modèles de devis',
                  onPressed: () => context.go('/quotes/templates'),
                ),
                IconButton(
                  icon: const Icon(Icons.auto_awesome),
                  tooltip: 'Devis IA',
                  onPressed: () => context.go('/quotes/ai'),
                ),
              ],
            ),
            if (!state.loading) ...[
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
                                  Text('${_fmtShort(state.totalApproved)} XOF',
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
                          _StatChip(label: 'Brouillons', count: state.count(QuoteStatus.draft), color: cs.onSurfaceVariant),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Envoyés', count: state.count(QuoteStatus.sent), color: Colors.blue),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Approuvés', count: state.count(QuoteStatus.approved), color: Colors.green),
                          const SizedBox(width: 8),
                          _StatChip(label: 'Refusés', count: state.count(QuoteStatus.rejected), color: AppColors.red),
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
                              onSelected: (_) => setState(() { _filter = null; _displayCount = _kPageSize; }),
                            ),
                            const SizedBox(width: 8),
                            ...QuoteStatus.values.map((s) => Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: FilterChip(
                                    label: Text(_statusLabel(s)),
                                    selected: _filter == s,
                                    onSelected: (_) => setState(() {
                                      _filter = _filter == s ? null : s;
                                      _displayCount = _kPageSize;
                                    }),
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
                  padding: EdgeInsets.fromLTRB(16, 8, 16, hasMore ? 8 : 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => _QuoteTile(quote: displayed[i]),
                      childCount: displayed.length,
                    ),
                  ),
                ),
              if (hasMore)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    child: OutlinedButton(
                      onPressed: () => setState(() => _displayCount += _kPageSize),
                      child: Text('Afficher plus (${visible.length - displayed.length} restants)'),
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
          if (result == true) ref.read(quotesProvider.notifier).load();
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
                    Flexible(child: Text('Val. ${q.validUntil}',
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: cs.onSurfaceVariant),
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.right)),
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
