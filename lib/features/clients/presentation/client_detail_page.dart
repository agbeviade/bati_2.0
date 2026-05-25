import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../core/theme/app_theme.dart';

class ClientDetailPage extends StatefulWidget {
  final String id;
  const ClientDetailPage({super.key, required this.id});

  @override
  State<ClientDetailPage> createState() => _ClientDetailPageState();
}

class _ClientDetailPageState extends State<ClientDetailPage> {
  bool _loading = true;
  AppUser? _client;
  List<Map<String, dynamic>> _quotes = [];
  List<Map<String, dynamic>> _invoices = [];

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait<dynamic>([
        client.from('users').select().eq('id', widget.id).single(),
        client
            .from('quotes')
            .select('id, quote_number, client_name, total, status, created_at')
            .eq('client_id', widget.id)
            .order('created_at', ascending: false),
        client
            .from('invoices')
            .select('id, invoice_number, client_name, amount, status, due_date')
            .eq('client_id', widget.id)
            .order('created_at', ascending: false),
      ]);
      final user = AppUser.fromJson(results[0] as Map<String, dynamic>);
      setState(() {
        _client = user;
        _quotes = (results[1] as List).cast<Map<String, dynamic>>();
        _invoices = (results[2] as List).cast<Map<String, dynamic>>();
        _nameCtrl.text = user.fullName ?? '';
        _emailCtrl.text = user.email ?? '';
        _phoneCtrl.text = user.phone ?? '';
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('users').update({
        'full_name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
      }).eq('id', widget.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Client mis à jour')),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleActive() async {
    if (_client == null) return;
    final newValue = !_client!.isActive;
    final verb = newValue ? 'réactiver' : 'désactiver';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${newValue ? 'Réactiver' : 'Désactiver'} ce client ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(verb[0].toUpperCase() + verb.substring(1)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await Supabase.instance.client
          .from('users')
          .update({'is_active': newValue})
          .eq('id', widget.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  String _fmtAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_client == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Client introuvable')));
    }
    final c = _client!;
    final totalPaid = _invoices
        .where((i) => i['status'] == 'paid')
        .fold(0.0, (s, i) => s + ((i['amount'] as num?)?.toDouble() ?? 0));

    return Scaffold(
      appBar: AppBar(
        title: Text(c.fullName ?? 'Client'),
        actions: [
          TextButton(
            onPressed: _toggleActive,
            child: Text(
              c.isActive ? 'Désactiver' : 'Réactiver',
              style: TextStyle(color: c.isActive ? AppColors.red : AppColors.green),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Stats ──────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.description_outlined,
                    color: Colors.blue,
                    value: '${_quotes.length}',
                    label: 'Devis',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    icon: Icons.receipt_outlined,
                    color: AppColors.green,
                    value: _fmtAmount(totalPaid),
                    label: 'Encaissé',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Informations ───────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('Informations',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600)),
                        if (!c.isActive) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: cs.onSurface.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('Inactif',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(color: cs.onSurfaceVariant)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Nom complet',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      textCapitalization: TextCapitalization.words,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _emailCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Téléphone',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _saving ? null : _save,
                        child: _saving
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Enregistrer'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ── Devis liés ────────────────────────────────────
            if (_quotes.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text('Devis (${_quotes.length})',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: _quotes.map((q) {
                    final total = (q['total'] as num?)?.toDouble() ?? 0;
                    final status = quoteStatusFromString(q['status'] as String? ?? 'draft');
                    return ListTile(
                      dense: true,
                      onTap: () => context.push('/quotes/${q['id']}'),
                      title: Text(q['quote_number'] as String? ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                      subtitle: Text(_fmtAmount(total),
                          style: TextStyle(fontSize: 12, color: cs.primary, fontWeight: FontWeight.w600)),
                      trailing: QuoteStatusBadge(status: status),
                    );
                  }).toList(),
                ),
              ),
            ],

            // ── Factures liées ────────────────────────────────
            if (_invoices.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text('Factures (${_invoices.length})',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: _invoices.map((inv) {
                    final amount = (inv['amount'] as num?)?.toDouble() ?? 0;
                    final status = invoiceStatusFromString(inv['status'] as String? ?? 'draft');
                    return ListTile(
                      dense: true,
                      onTap: () => context.push('/invoices/${inv['id']}'),
                      title: Text(inv['invoice_number'] as String? ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                      subtitle: Text(_fmtAmount(amount),
                          style: TextStyle(fontSize: 12, color: cs.primary, fontWeight: FontWeight.w600)),
                      trailing: InvoiceStatusBadge(status: status),
                    );
                  }).toList(),
                ),
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  final String label;
  const _StatCard({required this.icon, required this.color, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  Text(label,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
