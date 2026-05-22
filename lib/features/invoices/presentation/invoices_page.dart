import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';

class InvoicesPage extends StatefulWidget {
  const InvoicesPage({super.key});

  @override
  State<InvoicesPage> createState() => _InvoicesPageState();
}

class _InvoicesPageState extends State<InvoicesPage> {
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
      final data = await Supabase.instance.client
          .from('invoices')
          .select()
          .order('created_at', ascending: false);
      setState(() {
        _invoices = (data as List).map((j) => Invoice.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final overdue = _invoices.where((i) => i.isOverdue).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Factures')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _invoices.isEmpty
                  ? const EmptyState(icon: Icons.receipt_long_outlined, title: 'Aucune facture', subtitle: 'Créez vos factures depuis la version web')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _invoices.length + (overdue > 0 ? 1 : 0),
                      itemBuilder: (_, i) {
                        if (overdue > 0 && i == 0) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                            child: Row(
                              children: [
                                const Icon(Icons.warning_amber, color: Color(0xFFDC2626), size: 18),
                                const SizedBox(width: 8),
                                Text('$overdue facture${overdue > 1 ? 's' : ''} en retard',
                                    style: const TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w500, fontSize: 13)),
                              ],
                            ),
                          );
                        }
                        final idx = overdue > 0 ? i - 1 : i;
                        return _InvoiceTile(invoice: _invoices[idx]);
                      },
                    ),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(inv.invoiceNumber, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
                InvoiceStatusBadge(status: inv.status),
              ],
            ),
            const SizedBox(height: 4),
            if (inv.clientName != null)
              Text(inv.clientName!, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_fmt(inv.amount), style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: inv.isOverdue ? const Color(0xFFDC2626) : cs.primary)),
                if (inv.dueDate != null)
                  Row(
                    children: [
                      Icon(Icons.event, size: 14, color: inv.isOverdue ? const Color(0xFFDC2626) : cs.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(inv.dueDate!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: inv.isOverdue ? const Color(0xFFDC2626) : cs.onSurfaceVariant)),
                    ],
                  ),
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
