import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';

class InvoicesPage extends StatefulWidget {
  const InvoicesPage({super.key});

  @override
  State<InvoicesPage> createState() => _InvoicesPageState();
}

class _InvoicesPageState extends State<InvoicesPage> {
  bool _loading = true;
  List<Invoice> _invoices = [];
  String _filter = 'all'; // all | draft | sent | paid | overdue

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client
          .from('invoices')
          .select()
          .order('created_at', ascending: false);
      setState(() {
        _invoices = (data as List).map((j) => Invoice.fromJson(j as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<Invoice> get _filtered {
    if (_filter == 'all') return _invoices;
    if (_filter == 'overdue') return _invoices.where((i) => i.isOverdue).toList();
    return _invoices.where((i) => _statusToFilter(i.status) == _filter).toList();
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
    final all = _invoices;
    final overdue = all.where((i) => i.isOverdue).length;
    final paid = all.where((i) => i.status == InvoiceStatus.paid).length;
    final draft = all.where((i) => i.status == InvoiceStatus.draft).length;
    final sent = all.where((i) => i.status == InvoiceStatus.sent && !i.isOverdue).length;
    final totalPaid = all.where((i) => i.status == InvoiceStatus.paid).fold(0.0, (s, i) => s + i.amount);
    final filtered = _filtered;

    return Scaffold(
      appBar: AppBar(title: const Text('Factures')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push('/invoices/new');
          if (result == true || result == null) _load();
        },
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle facture'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: CustomScrollView(
                slivers: [
                  // ── Stats ──────────────────────────────────────
                  if (all.isNotEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        child: Column(
                          children: [
                            // Total encaissé
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
                                    Text(_fmtAmount(totalPaid),
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
                            // Mini stats
                            Row(children: [
                              _StatChip(label: 'Brouillons', count: draft, color: const Color(0xFF94A3B8)),
                              const SizedBox(width: 6),
                              _StatChip(label: 'Envoyées', count: sent, color: AppColors.primary),
                              const SizedBox(width: 6),
                              _StatChip(label: 'Payées', count: paid, color: AppColors.green),
                              const SizedBox(width: 6),
                              _StatChip(label: 'En retard', count: overdue, color: AppColors.red),
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
                            _FilterChip(label: 'Toutes', value: 'all', selected: _filter == 'all', onTap: () => setState(() => _filter = 'all')),
                            _FilterChip(label: 'Brouillons', value: 'draft', selected: _filter == 'draft', onTap: () => setState(() => _filter = 'draft')),
                            _FilterChip(label: 'Envoyées', value: 'sent', selected: _filter == 'sent', onTap: () => setState(() => _filter = 'sent')),
                            _FilterChip(label: 'Payées', value: 'paid', selected: _filter == 'paid', onTap: () => setState(() => _filter = 'paid')),
                            _FilterChip(label: 'En retard', value: 'overdue', selected: _filter == 'overdue', onTap: () => setState(() => _filter = 'overdue')),
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
                      padding: const EdgeInsets.all(16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (_, i) => _InvoiceTile(invoice: filtered[i]),
                          childCount: filtered.length,
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
                Row(children: [
                  Icon(Icons.event, size: 14, color: inv.isOverdue ? AppColors.red : cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(inv.dueDate!, style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: inv.isOverdue ? AppColors.red : cs.onSurfaceVariant,
                  )),
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
