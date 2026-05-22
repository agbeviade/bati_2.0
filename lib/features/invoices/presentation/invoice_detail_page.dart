import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';

class InvoiceDetailPage extends StatefulWidget {
  final String id;
  const InvoiceDetailPage({super.key, required this.id});

  @override
  State<InvoiceDetailPage> createState() => _InvoiceDetailPageState();
}

class _InvoiceDetailPageState extends State<InvoiceDetailPage> {
  bool _loading = true;
  bool _saving = false;
  Invoice? _invoice;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client.from('invoices').select().eq('id', widget.id).single();
      setState(() {
        _invoice = Invoice.fromJson(data);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(InvoiceStatus newStatus) async {
    setState(() => _saving = true);
    try {
      final patch = <String, dynamic>{'status': _statusToDb(newStatus)};
      if (newStatus == InvoiceStatus.paid) {
        patch['paid_at'] = DateTime.now().toUtc().toIso8601String();
      }
      await Supabase.instance.client.from('invoices').update(patch).eq('id', widget.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Statut mis à jour : ${_statusLabel(newStatus)}')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _statusToDb(InvoiceStatus s) => switch (s) {
        InvoiceStatus.draft => 'draft',
        InvoiceStatus.sent => 'sent',
        InvoiceStatus.paid => 'paid',
        InvoiceStatus.overdue => 'overdue',
        InvoiceStatus.canceled => 'canceled',
      };

  String _statusLabel(InvoiceStatus s) => switch (s) {
        InvoiceStatus.draft => 'Brouillon',
        InvoiceStatus.sent => 'Envoyée',
        InvoiceStatus.paid => 'Payée',
        InvoiceStatus.overdue => 'En retard',
        InvoiceStatus.canceled => 'Annulée',
      };

  List<(InvoiceStatus, String, Color)> _nextActions(InvoiceStatus current) => switch (current) {
        InvoiceStatus.draft => [
            (InvoiceStatus.sent, 'Marquer envoyée', const Color(0xFF1D4ED8)),
            (InvoiceStatus.canceled, 'Annuler', Colors.red),
          ],
        InvoiceStatus.sent => [
            (InvoiceStatus.paid, 'Marquer payée', const Color(0xFF16A34A)),
            (InvoiceStatus.overdue, 'Marquer en retard', const Color(0xFFEA580C)),
            (InvoiceStatus.canceled, 'Annuler', Colors.red),
          ],
        InvoiceStatus.overdue => [
            (InvoiceStatus.paid, 'Marquer payée', const Color(0xFF16A34A)),
            (InvoiceStatus.canceled, 'Annuler', Colors.red),
          ],
        _ => [],
      };

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(2)} M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_invoice == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Facture introuvable')));
    final inv = _invoice!;
    final actions = _nextActions(inv.status);

    return Scaffold(
      appBar: AppBar(
        title: Text(inv.invoiceNumber),
        actions: [
          if (inv.pdfUrl != null)
            IconButton(
              icon: const Icon(Icons.picture_as_pdf_outlined),
              tooltip: 'Voir le PDF',
              onPressed: () async {
                final uri = Uri.parse(inv.pdfUrl!);
                if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
              },
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        InvoiceStatusBadge(status: inv.status),
                        if (inv.isOverdue)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(20)),
                            child: const Text('EN RETARD', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFDC2626))),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (inv.clientName != null)
                      Text(inv.clientName!, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(_fmt(inv.amount), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, color: cs.primary)),
                    const SizedBox(height: 12),
                    if (inv.dueDate != null)
                      _InfoRow(icon: Icons.event_outlined, label: 'Échéance', value: inv.dueDate!, urgent: inv.isOverdue),
                    if (inv.paidAt != null)
                      _InfoRow(icon: Icons.check_circle_outline, label: 'Payée le', value: inv.paidAt!.substring(0, 10)),
                    _InfoRow(icon: Icons.calendar_today_outlined, label: 'Créée le', value: inv.createdAt.toLocal().toString().substring(0, 10)),
                  ],
                ),
              ),
            ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text('Actions rapides', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              ...actions.map((action) {
                final (status, label, color) = action;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: _saving ? null : () => _updateStatus(status),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: color,
                        side: BorderSide(color: color),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: _saving
                          ? SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: color))
                          : Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
                    ),
                  ),
                );
              }),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool urgent;

  const _InfoRow({required this.icon, required this.label, required this.value, this.urgent = false});

  @override
  Widget build(BuildContext context) {
    final color = urgent ? const Color(0xFFDC2626) : Theme.of(context).colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 13, color: color)),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: urgent ? const Color(0xFFDC2626) : null)),
        ],
      ),
    );
  }
}
