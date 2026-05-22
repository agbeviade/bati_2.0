import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/models/models.dart';

class QuoteDetailPage extends StatefulWidget {
  final String id;
  const QuoteDetailPage({super.key, required this.id});

  @override
  State<QuoteDetailPage> createState() => _QuoteDetailPageState();
}

class _QuoteDetailPageState extends State<QuoteDetailPage> {
  bool _loading = true;
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

  String _fmt(double v) => '${v.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} XOF';

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_quote == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Devis introuvable')));
    final q = _quote!;

    // Grouper par catégorie
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
              icon: const Icon(Icons.picture_as_pdf_outlined),
              tooltip: 'Voir le PDF',
              onPressed: () async {
                final uri = Uri.parse(q.pdfUrl!);
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
            // Header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(q.clientName ?? 'Client inconnu', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold))),
                        QuoteStatusBadge(status: q.status),
                      ],
                    ),
                    if (q.projectType != null) ...[
                      const SizedBox(height: 4),
                      Text(q.projectType!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
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
                    if (q.validUntil != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.event_outlined, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text('Valide jusqu\'au ${q.validUntil}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Lignes par catégorie
            if (_items.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('Détail (${_items.length} ligne${_items.length > 1 ? 's' : ''})',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...byCategory.entries.map((entry) => _CategorySection(
                category: _categoryLabel(entry.key),
                items: entry.value,
                fmt: _fmt,
              )),
            ],
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
        Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: bold ? FontWeight.bold : FontWeight.w500, color: color)),
      ],
    );
  }
}

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
          child: Text(category.toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant, letterSpacing: 1)),
        ),
        Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Column(
            children: items.map((item) {
              final qty = (item['qty'] as num?)?.toDouble() ?? 0;
              final unit = item['unit'] as String? ?? 'u';
              final unitPrice = (item['unit_price'] as num?)?.toDouble() ?? 0;
              final total = (item['total_price'] as num?)?.toDouble() ?? qty * unitPrice;
              return ListTile(
                dense: true,
                title: Text(item['description'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                subtitle: Text('$qty $unit × ${fmt(unitPrice)}', style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant)),
                trailing: Text(fmt(total), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}
