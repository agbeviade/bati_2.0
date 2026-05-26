import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/models/models.dart';
import '../../../core/services/pdf_service.dart';
import '../../../core/theme/app_theme.dart';

class QuoteDetailPage extends StatefulWidget {
  final String id;
  const QuoteDetailPage({super.key, required this.id});

  @override
  State<QuoteDetailPage> createState() => _QuoteDetailPageState();
}

class _QuoteDetailPageState extends State<QuoteDetailPage> {
  bool _loading = true;
  bool _exporting = false;
  Quote? _quote;
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait<dynamic>([
        client.from('quotes').select().eq('id', widget.id).single(),
        client.from('quote_items').select().eq('quote_id', widget.id).order('category').order('created_at'),
      ]);
      setState(() {
        _quote = Quote.fromJson(results[0] as Map<String, dynamic>);
        _items = (results[1] as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(QuoteStatus status) async {
    try {
      final s = switch (status) {
        QuoteStatus.draft => 'draft',
        QuoteStatus.sent => 'sent',
        QuoteStatus.approved => 'approved',
        QuoteStatus.rejected => 'rejected',
        QuoteStatus.expired => 'expired',
      };
      await Supabase.instance.client.from('quotes').update({'status': s}).eq('id', widget.id);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer le devis ?'),
        content: const Text('Cette action est irréversible. Les lignes associées seront également supprimées.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await Supabase.instance.client.from('quotes').delete().eq('id', widget.id);
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    }
  }

  Future<void> _shareAsPdf() async {
    if (_quote == null) return;
    setState(() => _exporting = true);
    try {
      await PdfService.shareQuote(_quote!, _items);
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

  String _fmt(double v) =>
      '${v.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} XOF';

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_quote == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Devis introuvable')));
    final q = _quote!;

    final Map<String, List<Map<String, dynamic>>> byCategory = {};
    for (final item in _items) {
      final cat = item['category'] as String? ?? 'other';
      byCategory.putIfAbsent(cat, () => []).add(item);
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(q.quoteNumber),
        actions: [
          if (q.pdfUrl != null)
            IconButton(
              icon: const Icon(Icons.open_in_browser_outlined),
              tooltip: 'Voir le PDF en ligne',
              onPressed: () async {
                final uri = Uri.parse(q.pdfUrl!);
                if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
              },
            ),
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
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'edit') {
                final result = await context.push('/quotes/${widget.id}/edit', extra: q);
                if (result == true) _load();
              } else if (v == 'delete') {
                await _delete();
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit_outlined), title: Text('Modifier'), dense: true)),
              const PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete_outline, color: Colors.red), title: Text('Supprimer', style: TextStyle(color: Colors.red)), dense: true)),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Header ──────────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            q.clientName ?? 'Client inconnu',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ),
                        QuoteStatusBadge(status: q.status),
                      ],
                    ),
                    if (q.projectType != null) ...[
                      const SizedBox(height: 4),
                      Text(q.projectType!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                    ],
                    if (q.surfaceM2 != null) ...[
                      const SizedBox(height: 2),
                      Text('Surface : ${q.surfaceM2!.toStringAsFixed(0)} m²',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                    ],
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _AmountRow(label: 'HT', value: _fmt(q.subtotal)),
                        _AmountRow(label: 'TVA ${(q.taxRate * 100).toStringAsFixed(0)}%', value: _fmt(q.subtotal * q.taxRate)),
                        _AmountRow(label: 'TTC', value: _fmt(q.total), bold: true, color: cs.primary),
                      ],
                    ),
                    if (q.marginPct > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.trending_up_outlined, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text('Marge : ${(q.marginPct * 100).toStringAsFixed(0)}%',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                        ],
                      ),
                    ],
                    if (q.validUntil != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.event_outlined, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text('Valide jusqu\'au ${q.validUntil}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                        ],
                      ),
                    ],
                    if (q.notes != null && q.notes!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: cs.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(q.notes!, style: Theme.of(context).textTheme.bodySmall),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // ── Actions de statut ────────────────────────────────
            const SizedBox(height: 12),
            _StatusActionsRow(status: q.status, onUpdate: _updateStatus),

            // ── Lignes par catégorie ─────────────────────────────
            if (_items.isNotEmpty) ...[
              const SizedBox(height: 20),
              Row(
                children: [
                  Text('Détail (${_items.length} ligne${_items.length > 1 ? 's' : ''})',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const Spacer(),
                  Text(_fmt(q.total),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(color: cs.primary, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              ...byCategory.entries.map((entry) => _CategorySection(
                    category: _categoryLabel(entry.key),
                    items: entry.value,
                    fmt: _fmt,
                  )),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  String _categoryLabel(String c) => switch (c) {
        'material' => 'Matériaux',
        'labor' => 'Main d\'œuvre',
        'transport' => 'Transport',
        'equipment' => 'Équipement',
        _ => 'Autres',
      };
}

// ── Status actions ──────────────────────────────────────────────────────────

class _StatusActionsRow extends StatelessWidget {
  final QuoteStatus status;
  final Future<void> Function(QuoteStatus) onUpdate;

  const _StatusActionsRow({required this.status, required this.onUpdate});

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[];

    switch (status) {
      case QuoteStatus.draft:
        actions.add(_ActionBtn(
          label: 'Marquer envoyé',
          icon: Icons.send_outlined,
          color: Colors.blue,
          onTap: () => onUpdate(QuoteStatus.sent),
        ));
      case QuoteStatus.sent:
        actions.add(_ActionBtn(
          label: 'Approuvé',
          icon: Icons.check_circle_outline,
          color: Colors.green,
          onTap: () => onUpdate(QuoteStatus.approved),
        ));
        actions.add(_ActionBtn(
          label: 'Refusé',
          icon: Icons.cancel_outlined,
          color: AppColors.red,
          onTap: () => onUpdate(QuoteStatus.rejected),
        ));
      case QuoteStatus.approved:
        actions.add(_ActionBtn(
          label: 'Remettre en brouillon',
          icon: Icons.undo_outlined,
          color: Colors.grey,
          onTap: () => onUpdate(QuoteStatus.draft),
        ));
      case QuoteStatus.rejected:
        actions.add(_ActionBtn(
          label: 'Réouvrir',
          icon: Icons.refresh_outlined,
          color: Colors.orange,
          onTap: () => onUpdate(QuoteStatus.draft),
        ));
      case QuoteStatus.expired:
        actions.add(_ActionBtn(
          label: 'Réouvrir',
          icon: Icons.refresh_outlined,
          color: Colors.orange,
          onTap: () => onUpdate(QuoteStatus.draft),
        ));
    }

    if (actions.isEmpty) return const SizedBox.shrink();

    return Wrap(spacing: 8, children: actions);
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionBtn({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(foregroundColor: color, side: BorderSide(color: color.withValues(alpha: 0.5))),
      onPressed: onTap,
    );
  }
}

// ── Amount row ──────────────────────────────────────────────────────────────

class _AmountRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? color;
  const _AmountRow({required this.label, required this.value, this.bold = false, this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(label,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        Text(value,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(fontWeight: bold ? FontWeight.bold : FontWeight.w500, color: color)),
      ],
    );
  }
}

// ── Category section ────────────────────────────────────────────────────────

class _CategorySection extends StatelessWidget {
  final String category;
  final List<Map<String, dynamic>> items;
  final String Function(double) fmt;
  const _CategorySection({required this.category, required this.items, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Text(category.toUpperCase(),
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: cs.onSurfaceVariant, letterSpacing: 1)),
        ),
        Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Column(
            children: items.map((item) {
              final qty = (item['quantity'] as num?)?.toDouble() ?? 0;
              final unit = item['unit'] as String? ?? 'u';
              final unitPrice = (item['unit_price'] as num?)?.toDouble() ?? 0;
              final total = qty * unitPrice;
              return ListTile(
                dense: true,
                title: Text(item['label'] as String? ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                subtitle: Text('$qty $unit × ${fmt(unitPrice)}',
                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant)),
                trailing: Text(fmt(total), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
