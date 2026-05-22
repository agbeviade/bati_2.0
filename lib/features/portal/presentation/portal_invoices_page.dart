import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';

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
          .select()
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
        title: const Text('Mes factures'),
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
              child: _invoices.isEmpty
                  ? const EmptyState(icon: Icons.receipt_long_outlined, title: 'Aucune facture', subtitle: 'Vos factures apparaîtront ici')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _invoices.length,
                      itemBuilder: (_, i) {
                        final inv = _invoices[i];
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
                                      Expanded(child: Text(inv.invoiceNumber, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant, fontFamily: 'monospace'))),
                                      InvoiceStatusBadge(status: inv.status),
                                    ],
                                  ),
                                  if (inv.clientName != null) ...[
                                    const SizedBox(height: 4),
                                    Text(inv.clientName!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                                  ],
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(_fmt(inv.amount), style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: cs.primary)),
                                      if (inv.dueDate != null)
                                        Text('Échéance : ${inv.dueDate}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: inv.isOverdue ? Colors.red : cs.onSurfaceVariant)),
                                    ],
                                  ),
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
