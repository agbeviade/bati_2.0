import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';

class PortalInvoicesPage extends StatefulWidget {
  const PortalInvoicesPage({super.key});

  @override
  State<PortalInvoicesPage> createState() => _PortalInvoicesPageState();
}

class _PortalInvoicesPageState extends State<PortalInvoicesPage> {
  bool _loading = true;
  List<Invoice> _invoices = [];

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
          .from('invoices')
          .select('id, invoice_number, amount, status, due_date, paid_at, created_at')
          .eq('client_id', uid)
          .order('created_at', ascending: false);
      setState(() {
        _invoices = (data as List).map((j) => Invoice.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _fmtAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }

  String _fmtDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso.length >= 10 ? iso.substring(0, 10) : iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    final totalDue = _invoices
        .where((i) => i.status == InvoiceStatus.sent || i.status == InvoiceStatus.overdue)
        .fold(0.0, (s, i) => s + i.amount);
    final totalPaid = _invoices
        .where((i) => i.status == InvoiceStatus.paid)
        .fold(0.0, (s, i) => s + i.amount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes factures'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Déconnexion',
            onPressed: () => Supabase.instance.client.auth.signOut(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _invoices.isEmpty
                  ? const EmptyState(
                      icon: Icons.receipt_long_outlined,
                      title: 'Aucune facture',
                      subtitle: 'Vos factures apparaîtront ici',
                    )
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // ── Résumé financier ────────────────────────
                        if (totalDue > 0 || totalPaid > 0) ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'À payer',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                  color: cs.onSurfaceVariant),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _fmtAmount(totalDue),
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: totalDue > 0
                                                ? AppColors.red
                                                : cs.onSurface,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    width: 1,
                                    height: 36,
                                    color: cs.outlineVariant,
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          'Payé',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                  color: cs.onSurfaceVariant),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          _fmtAmount(totalPaid),
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.green,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],

                        // ── Liste factures ──────────────────────────
                        ..._invoices.map((inv) {
                          final overdue = inv.isOverdue;
                          final paid = inv.status == InvoiceStatus.paid;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: overdue
                                  ? BorderSide(
                                      color:
                                          AppColors.red.withValues(alpha: 0.4))
                                  : BorderSide.none,
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          inv.invoiceNumber,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                color: cs.onSurfaceVariant,
                                                fontFamily: 'monospace',
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                      ),
                                      InvoiceStatusBadge(status: inv.status),
                                      if (overdue) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.red
                                                .withValues(alpha: 0.12),
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            'EN RETARD',
                                            style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.red),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        _fmtAmount(inv.amount),
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: overdue
                                                  ? AppColors.red
                                                  : cs.primary,
                                            ),
                                      ),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          if (inv.dueDate != null && !paid)
                                            Text(
                                              'Échéance : ${_fmtDate(inv.dueDate)}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall
                                                  ?.copyWith(
                                                    fontSize: 11,
                                                    color: overdue
                                                        ? AppColors.red
                                                        : cs.onSurfaceVariant,
                                                  ),
                                            ),
                                          if (paid && inv.paidAt != null)
                                            Text(
                                              'Payée le ${_fmtDate(inv.paidAt)}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall
                                                  ?.copyWith(
                                                    fontSize: 11,
                                                    color: AppColors.green,
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
            ),
    );
  }
}
