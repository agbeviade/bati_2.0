import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../core/services/pdf_service.dart';
import '../../../core/theme/app_theme.dart';

class InvoiceDetailPage extends StatefulWidget {
  final String id;
  const InvoiceDetailPage({super.key, required this.id});

  @override
  State<InvoiceDetailPage> createState() => _InvoiceDetailPageState();
}

class _InvoiceDetailPageState extends State<InvoiceDetailPage> {
  bool _loading = true;
  bool _saving = false;
  bool _exporting = false;
  Invoice? _invoice;
  List<Payment> _payments = [];
  bool _paymentsLoaded = false;

  // Formulaire ajout paiement
  bool _showPayForm = false;
  bool _savingPay = false;
  PaymentMethod _payMethod = PaymentMethod.cash;
  final _payAmountCtrl = TextEditingController();
  final _payRefCtrl = TextEditingController();
  DateTime _payDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _payAmountCtrl.dispose();
    _payRefCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client
          .from('invoices')
          .select()
          .eq('id', widget.id)
          .single();
      setState(() {
        _invoice = Invoice.fromJson(data);
        _loading = false;
      });
      _loadPayments();
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadPayments() async {
    try {
      final data = await Supabase.instance.client
          .from('payments')
          .select()
          .eq('invoice_id', widget.id)
          .order('paid_at', ascending: false);
      setState(() {
        _payments = (data as List)
            .map((j) => Payment.fromJson(j as Map<String, dynamic>))
            .toList();
        _paymentsLoaded = true;
      });
    } catch (_) {
      setState(() => _paymentsLoaded = true);
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Statut : ${_statusLabel(newStatus)}')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteInvoice() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer la facture'),
        content: const Text('Cette action est irréversible. Les paiements associés seront aussi supprimés.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await Supabase.instance.client.from('invoices').delete().eq('id', widget.id);
      if (mounted) context.go('/invoices');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _addPayment() async {
    final amount = double.tryParse(_payAmountCtrl.text.replaceAll(',', '.').replaceAll(' ', ''));
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Montant invalide')));
      return;
    }
    setState(() => _savingPay = true);
    try {
      await Supabase.instance.client.from('payments').insert({
        'invoice_id': widget.id,
        'amount': amount,
        'method': paymentMethodToString(_payMethod),
        'reference': _payRefCtrl.text.trim().isEmpty ? null : _payRefCtrl.text.trim(),
        'paid_at': _payDate.toIso8601String(),
      });
      _payAmountCtrl.clear();
      _payRefCtrl.clear();
      setState(() { _showPayForm = false; _savingPay = false; _payDate = DateTime.now(); });
      _loadPayments();
    } catch (e) {
      setState(() => _savingPay = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _deletePayment(Payment p) async {
    try {
      await Supabase.instance.client.from('payments').delete().eq('id', p.id);
      _loadPayments();
    } catch (_) {}
  }

  Future<void> _pickPayDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _payDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (d != null) setState(() => _payDate = d);
  }

  Future<void> _shareAsPdf() async {
    if (_invoice == null) return;
    setState(() => _exporting = true);
    try {
      await PdfService.shareInvoice(_invoice!);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur PDF : $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
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

  List<(InvoiceStatus, String, Color)> _nextActions(InvoiceStatus current) =>
      switch (current) {
        InvoiceStatus.draft => [
            (InvoiceStatus.sent, 'Marquer envoyée', const Color(0xFF1D4ED8)),
            (InvoiceStatus.canceled, 'Annuler', AppColors.red),
          ],
        InvoiceStatus.sent => [
            (InvoiceStatus.paid, 'Marquer payée', AppColors.green),
            (InvoiceStatus.overdue, 'Marquer en retard', AppColors.orange),
            (InvoiceStatus.canceled, 'Annuler', AppColors.red),
          ],
        InvoiceStatus.overdue => [
            (InvoiceStatus.paid, 'Marquer payée', AppColors.green),
            (InvoiceStatus.canceled, 'Annuler', AppColors.red),
          ],
        _ => [],
      };

  String _fmtAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(2)} M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)} K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_invoice == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Facture introuvable')));
    }
    final inv = _invoice!;
    final actions = _nextActions(inv.status);
    final totalPaid = _payments.fold(0.0, (s, p) => s + p.amount);
    final remaining = inv.amount - totalPaid;

    return Scaffold(
      appBar: AppBar(
        title: Text(inv.invoiceNumber),
        actions: [
          // Éditer
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Modifier',
            onPressed: () async {
              final updated = await context.push('/invoices/${widget.id}/edit', extra: inv);
              if (updated == true) _load();
            },
          ),
          // PDF en ligne
          if (inv.pdfUrl != null)
            IconButton(
              icon: const Icon(Icons.open_in_browser_outlined),
              tooltip: 'Voir PDF',
              onPressed: () async {
                final uri = Uri.parse(inv.pdfUrl!);
                if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
              },
            ),
          // Partager PDF
          _exporting
              ? const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : IconButton(
                  icon: const Icon(Icons.share_outlined),
                  tooltip: 'Partager PDF',
                  onPressed: _shareAsPdf,
                ),
          // Menu suppression
          PopupMenuButton<String>(
            onSelected: (v) { if (v == 'delete') _deleteInvoice(); },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'delete',
                child: Row(children: [
                  Icon(Icons.delete_outline, color: Colors.red, size: 18),
                  SizedBox(width: 8),
                  Text('Supprimer', style: TextStyle(color: Colors.red)),
                ]),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [

            // ── Carte principale ──────────────────────────────────
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
                            decoration: BoxDecoration(
                              color: AppColors.red.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text('EN RETARD', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.red)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (inv.clientName != null)
                      Text(inv.clientName!, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(
                      _fmtAmount(inv.amount),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: cs.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (inv.dueDate != null)
                      _InfoRow(
                        icon: Icons.event_outlined,
                        label: 'Échéance',
                        value: inv.dueDate!,
                        urgent: inv.isOverdue,
                      ),
                    if (inv.paidAt != null)
                      _InfoRow(
                        icon: Icons.check_circle_outline,
                        label: 'Payée le',
                        value: inv.paidAt!.substring(0, 10),
                        color: AppColors.green,
                      ),
                    _InfoRow(
                      icon: Icons.calendar_today_outlined,
                      label: 'Créée le',
                      value: inv.createdAt.toLocal().toString().substring(0, 10),
                    ),
                    if (inv.notes != null) ...[
                      const Divider(height: 20),
                      Text(inv.notes!, style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant)),
                    ],
                  ],
                ),
              ),
            ),

            // ── Actions statut ────────────────────────────────────
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('Actions rapides', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
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

            // ── Section Paiements ─────────────────────────────────
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Paiements', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                        FilledButton.icon(
                          onPressed: inv.status == InvoiceStatus.canceled
                              ? null
                              : () => setState(() => _showPayForm = !_showPayForm),
                          icon: Icon(_showPayForm ? Icons.close : Icons.add, size: 16),
                          label: const Text('Ajouter'),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            textStyle: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ],
                    ),

                    // Barre progression paiements
                    if (inv.amount > 0) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_fmtAmount(totalPaid), style: TextStyle(fontSize: 13, color: AppColors.green, fontWeight: FontWeight.w600)),
                          Text('/ ${_fmtAmount(inv.amount)}', style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: (totalPaid / inv.amount).clamp(0.0, 1.0),
                          backgroundColor: const Color(0xFFE2E8F0),
                          color: totalPaid >= inv.amount ? AppColors.green : AppColors.primary,
                          minHeight: 6,
                        ),
                      ),
                      if (remaining > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Reste à encaisser : ${_fmtAmount(remaining)}',
                              style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
                        ),
                    ],

                    // Formulaire ajout paiement
                    if (_showPayForm) ...[
                      const SizedBox(height: 14),
                      const Divider(),
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Montant *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _payAmountCtrl,
                            decoration: _payDeco(hint: '0', suffix: 'XOF'),
                            keyboardType: TextInputType.number,
                          ),
                        ])),
                        const SizedBox(width: 10),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Méthode', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<PaymentMethod>(
                            value: _payMethod,
                            decoration: _payDeco(),
                            items: PaymentMethod.values.map((m) => DropdownMenuItem<PaymentMethod>(
                              value: m,
                              child: Text(paymentMethodLabel(m)),
                            )).toList(),
                            onChanged: (v) => setState(() => _payMethod = v ?? PaymentMethod.cash),
                          ),
                        ])),
                      ]),
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 4),
                          InkWell(
                            onTap: _pickPayDate,
                            child: InputDecorator(
                              decoration: _payDeco(),
                              child: Text(_fmtDate(_payDate), style: const TextStyle(fontSize: 14)),
                            ),
                          ),
                        ])),
                        const SizedBox(width: 10),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Référence', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _payRefCtrl,
                            decoration: _payDeco(hint: 'N° virement...'),
                          ),
                        ])),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        FilledButton(
                          onPressed: _savingPay ? null : _addPayment,
                          child: Text(_savingPay ? 'Enregistrement...' : 'Enregistrer'),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () => setState(() => _showPayForm = false),
                          child: const Text('Annuler'),
                        ),
                      ]),
                    ],

                    // Liste paiements
                    if (!_paymentsLoaded)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                      )
                    else if (_payments.isEmpty && !_showPayForm)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(child: Text('Aucun paiement enregistré.', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13))),
                      )
                    else ...[
                      const SizedBox(height: 12),
                      ..._payments.asMap().entries.map((entry) {
                        final i = entry.key;
                        final p = entry.value;
                        final methodIcon = switch (p.method) {
                          PaymentMethod.transfer => Icons.account_balance_outlined,
                          PaymentMethod.check => Icons.description_outlined,
                          PaymentMethod.cash => Icons.payments_outlined,
                          PaymentMethod.other => Icons.more_horiz,
                        };
                        return Column(children: [
                          if (i > 0) const Divider(height: 1),
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Container(
                              width: 32, height: 32,
                              decoration: BoxDecoration(
                                color: AppColors.green.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(methodIcon, size: 16, color: AppColors.green),
                            ),
                            title: Text(
                              _fmtAmount(p.amount),
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              '${paymentMethodLabel(p.method)} · ${_fmtDate(p.paidAt.toLocal())}'
                              '${p.reference != null ? ' · ${p.reference}' : ''}',
                              style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18),
                              color: cs.onSurfaceVariant,
                              visualDensity: VisualDensity.compact,
                              onPressed: () => _deletePayment(p),
                            ),
                          ),
                        ]);
                      }),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

// ── Widgets helpers ───────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool urgent;
  final Color? color;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.urgent = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = urgent
        ? const Color(0xFFDC2626)
        : color ?? Theme.of(context).colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Icon(icon, size: 15, color: c),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 13, color: c)),
        const Spacer(),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: c)),
      ]),
    );
  }
}

InputDecoration _payDeco({String? hint, String? suffix}) => InputDecoration(
      hintText: hint,
      suffixText: suffix,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
    );
