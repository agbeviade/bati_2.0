import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';
import '../data/invoices_provider.dart';

const _kPageSize = 20;

class InvoicesPage extends ConsumerStatefulWidget {
  const InvoicesPage({super.key});

  @override
  ConsumerState<InvoicesPage> createState() => _InvoicesPageState();
}

class _InvoicesPageState extends ConsumerState<InvoicesPage> {
  String _filter = 'all';
  int _displayCount = _kPageSize;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(invoicesProvider.notifier).load();
    });
  }

  List<Invoice> _filtered(List<Invoice> all) {
    if (_filter == 'all') return all;
    if (_filter == 'overdue') return all.where((i) => i.isOverdue).toList();
    return all.where((i) => _statusToFilter(i.status) == _filter).toList();
  }

  String _statusToFilter(InvoiceStatus s) => switch (s) {
        InvoiceStatus.draft => 'draft',
        InvoiceStatus.sent => 'sent',
        InvoiceStatus.paid => 'paid',
        InvoiceStatus.overdue => 'overdue',
        InvoiceStatus.canceled => 'canceled',
      };

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(invoicesProvider);
    final all = state.items;
    final filtered = _filtered(all);
    final displayed = filtered.take(_displayCount).toList();
    final hasMore = displayed.length < filtered.length;

    return Scaffold(
      appBar: AppBar(title: const Text('Factures')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push('/invoices/new');
          if (result == true || result == null) ref.read(invoicesProvider.notifier).load();
        },
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle facture'),
      ),
      body: state.loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(invoicesProvider.notifier).load(),
              child: CustomScrollView(
                slivers: [
                  // ── Stats ──────────────────────────────────────
                  if (all.isNotEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        child: Column(
                          children: [
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                gradient: AppColors.gradientGreen,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    const Text('Total encaissé', style: TextStyle(color: Colors.white70, fontSize: 12)),
                                    Text(_fmtAmount(state.paidAmount),
                                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                                  ]),
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                                    child: const Icon(Icons.account_balance_wallet_outlined, color: Colors.white, size: 22),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(children: [
                              _StatChip(label: 'Brouillons', count: state.countDraft, color: const Color(0xFF94A3B8)),
                              const SizedBox(width: 6),
                              _StatChip(label: 'Envoyées', count: state.countSent, color: AppColors.primary),
                              const SizedBox(width: 6),
                              _StatChip(label: 'Payées', count: state.countPaid, color: AppColors.green),
                              const SizedBox(width: 6),
                              _StatChip(label: 'En retard', count: state.countOverdue, color: AppColors.red),
                            ]),
                          ],
                        ),
                      ),
                    ),

                  // ── Filtres ────────────────────────────────────
                  if (all.isNotEmpty)
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 44,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                          children: [
                            _FilterChip(label: 'Toutes', value: 'all', selected: _filter == 'all', onTap: () => setState(() { _filter = 'all'; _displayCount = _kPageSize; })),
                            _FilterChip(label: 'Brouillons', value: 'draft', selected: _filter == 'draft', onTap: () => setState(() { _filter = 'draft'; _displayCount = _kPageSize; })),
                            _FilterChip(label: 'Envoyées', value: 'sent', selected: _filter == 'sent', onTap: () => setState(() { _filter = 'sent'; _displayCount = _kPageSize; })),
                            _FilterChip(label: 'Payées', value: 'paid', selected: _filter == 'paid', onTap: () => setState(() { _filter = 'paid'; _displayCount = _kPageSize; })),
                            _FilterChip(label: 'En retard', value: 'overdue', selected: _filter == 'overdue', onTap: () => setState(() { _filter = 'overdue'; _displayCount = _kPageSize; })),
                          ],
                        ),
                      ),
                    ),

                  // ── Liste ──────────────────────────────────────
                  if (all.isEmpty)
                    const SliverFillRemaining(
                      child: EmptyState(
                        icon: Icons.receipt_long_outlined,
                        title: 'Aucune facture',
                        subtitle: 'Appuyez sur + pour créer votre première facture',
                      ),
                    )
                  else if (filtered.isEmpty)
                    SliverFillRemaining(
                      child: Center(child: Text('Aucune facture dans ce filtre.',
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))),
                    )
                  else
                    SliverPadding(
                      padding: EdgeInsets.fromLTRB(16, 8, 16, hasMore ? 8 : 100),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (_, i) => _InvoiceTile(invoice: displayed[i]),
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
                          child: Text('Afficher plus (${filtered.length - displayed.length} restants)'),
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  String _fmtAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }
}

// ── Widgets ───────────────────────────────────────────────────

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
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(children: [
          Text('$count', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.8))),
        ]),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? cs.primary : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(label, style: TextStyle(
          fontSize: 12,
          color: selected ? cs.onPrimary : cs.onSurfaceVariant,
          fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
        )),
      ),
    );
  }
}

class _InvoiceTile extends StatelessWidget {
  final Invoice invoice;
  const _InvoiceTile({required this.invoice});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final inv = invoice;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/invoices/${inv.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(inv.invoiceNumber, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
              InvoiceStatusBadge(status: inv.status),
            ]),
            const SizedBox(height: 4),
            if (inv.clientName != null)
              Text(inv.clientName!, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(
                _fmtAmount(inv.amount),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: inv.isOverdue ? AppColors.red : cs.primary,
                ),
              ),
              if (inv.dueDate != null)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.event, size: 14, color: inv.isOverdue ? AppColors.red : cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Flexible(child: Text(inv.dueDate!, style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: inv.isOverdue ? AppColors.red : cs.onSurfaceVariant,
                  ), overflow: TextOverflow.ellipsis)),
                ]),
            ]),
          ]),
        ),
      ),
    );
  }

  String _fmtAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }
}
