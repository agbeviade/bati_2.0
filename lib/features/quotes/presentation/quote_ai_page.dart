import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class QuoteAiPage extends StatefulWidget {
  const QuoteAiPage({super.key});

  @override
  State<QuoteAiPage> createState() => _QuoteAiPageState();
}

class _QuoteAiPageState extends State<QuoteAiPage> {
  final _descCtrl = TextEditingController();
  final _surfaceCtrl = TextEditingController();
  final _clientCtrl = TextEditingController();
  String _projectType = 'Construction neuve';
  bool _loading = false;
  List<_AiItem> _items = [];
  String _notes = '';
  bool _saving = false;

  static const _projectTypes = [
    'Construction neuve',
    'Rénovation',
    'Extension',
    'Finitions',
    'Génie civil',
    'Plomberie',
    'Électricité',
    'Peinture',
    'Autre',
  ];

  @override
  void dispose() {
    _descCtrl.dispose();
    _surfaceCtrl.dispose();
    _clientCtrl.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    final desc = _descCtrl.text.trim();
    if (desc.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Description trop courte (min. 10 caractères)')));
      return;
    }
    setState(() { _loading = true; _items = []; });
    try {
      final res = await Supabase.instance.client.functions.invoke('generate-quote', body: {
        'description': desc,
        if (_surfaceCtrl.text.isNotEmpty) 'surface_m2': double.tryParse(_surfaceCtrl.text),
        'project_type': _projectType,
        'currency': 'XOF',
      });
      if (res.status != 200) throw Exception(res.data?['error'] ?? 'Erreur IA');
      final data = res.data as Map<String, dynamic>;
      final rawItems = (data['items'] as List?) ?? [];
      setState(() {
        _items = rawItems.map((i) => _AiItem(
          category: i['category'] as String? ?? 'other',
          label: i['label'] as String? ?? '',
          quantity: (i['quantity'] as num?)?.toDouble() ?? 1,
          unit: i['unit'] as String? ?? 'u',
          unitPrice: (i['unit_price'] as num?)?.toDouble() ?? 0,
        )).toList();
        _notes = data['notes'] as String? ?? '';
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _saveQuote() async {
    if (_items.isEmpty) return;
    setState(() => _saving = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final client = Supabase.instance.client;

      // Récupère company_id
      final profile = await client.from('users').select('company_id').eq('id', uid).single();
      final companyId = profile['company_id'] as String?;
      if (companyId == null) throw Exception('Entreprise non configurée');

      // Génère un numéro de devis
      final countRes = await client.from('quotes').select('id').eq('company_id', companyId).count();
      final quoteNumber = 'DEV-${DateTime.now().year}-${(countRes.count + 1).toString().padLeft(3, '0')}';

      final subtotal = _items.fold(0.0, (s, i) => s + i.quantity * i.unitPrice);
      const taxRate = 0.18;
      final taxAmount = subtotal * taxRate;
      final total = subtotal + taxAmount;

      // Crée le devis
      final quoteRes = await client.from('quotes').insert({
        'company_id': companyId,
        'quote_number': quoteNumber,
        'client_name': _clientCtrl.text.trim().isEmpty ? null : _clientCtrl.text.trim(),
        'project_type': _projectType,
        'surface_m2': _surfaceCtrl.text.isEmpty ? null : double.tryParse(_surfaceCtrl.text),
        'subtotal': subtotal,
        'tax_rate': taxRate,
        'tax_amount': taxAmount,
        'total': total,
        'notes': _notes.isEmpty ? null : _notes,
        'ai_generated': true,
        'created_by': uid,
      }).select('id').single();

      final quoteId = quoteRes['id'] as String;

      // Insère les items
      await client.from('quote_items').insert(
        _items.asMap().entries.map((e) => {
          'quote_id': quoteId,
          'category': e.value.category,
          'label': e.value.label,
          'quantity': e.value.quantity,
          'unit': e.value.unit,
          'unit_price': e.value.unitPrice,
          'total': e.value.quantity * e.value.unitPrice,
          'sort_order': e.key,
        }).toList(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Devis créé avec succès !')));
        context.go('/quotes/$quoteId');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _categoryLabel(String c) => switch (c) {
    'material' => 'Matériaux',
    'labor' => 'Main d\'œuvre',
    'transport' => 'Transport',
    'equipment' => 'Équipement',
    _ => 'Autre',
  };

  Color _categoryColor(String c) => switch (c) {
    'material' => const Color(0xFF1D4ED8),
    'labor' => const Color(0xFF16A34A),
    'transport' => const Color(0xFFEA580C),
    'equipment' => const Color(0xFF7C3AED),
    _ => const Color(0xFF94A3B8),
  };

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final subtotal = _items.fold(0.0, (s, i) => s + i.quantity * i.unitPrice);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devis IA'),
        actions: [
          if (_items.isNotEmpty)
            TextButton.icon(
              onPressed: _saving ? null : _saveQuote,
              icon: _saving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save_outlined),
              label: const Text('Enregistrer'),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Formulaire
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Décrire le chantier', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _descCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Description du projet *',
                      hintText: 'Ex: Construction d\'une villa R+1 de 200m² avec 4 chambres, salon, cuisine, 2 salles de bain...',
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _surfaceCtrl,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Surface (m²)', suffixText: 'm²'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _clientCtrl,
                          decoration: const InputDecoration(labelText: 'Client (optionnel)'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _projectType,
                    decoration: const InputDecoration(labelText: 'Type de projet'),
                    items: _projectTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                    onChanged: (v) => setState(() => _projectType = v ?? _projectType),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _loading ? null : _generate,
                      icon: _loading
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.auto_awesome),
                      label: Text(_loading ? 'Génération en cours...' : 'Générer avec l\'IA'),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Résultats
          if (_items.isNotEmpty) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(child: Text('Devis généré (${_items.length} lignes)', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600))),
                Text('${_fmt(subtotal)} XOF HT', style: TextStyle(fontWeight: FontWeight.bold, color: cs.primary)),
              ],
            ),
            const SizedBox(height: 8),
            ..._items.map((item) => _ItemTile(item: item, categoryLabel: _categoryLabel, categoryColor: _categoryColor, fmt: _fmt)),
            if (_notes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Card(
                color: cs.surfaceContainerHighest,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Notes IA', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
                      const SizedBox(height: 4),
                      Text(_notes, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _TotalRow(label: 'Sous-total HT', value: '${_fmt(subtotal)} XOF'),
                    _TotalRow(label: 'TVA 18%', value: '${_fmt(subtotal * 0.18)} XOF'),
                    const Divider(),
                    _TotalRow(label: 'Total TTC', value: '${_fmt(subtotal * 1.18)} XOF', bold: true),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AiItem {
  final String category;
  final String label;
  final double quantity;
  final String unit;
  final double unitPrice;
  _AiItem({required this.category, required this.label, required this.quantity, required this.unit, required this.unitPrice});
}

class _ItemTile extends StatelessWidget {
  final _AiItem item;
  final String Function(String) categoryLabel;
  final Color Function(String) categoryColor;
  final String Function(double) fmt;
  const _ItemTile({required this.item, required this.categoryLabel, required this.categoryColor, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final color = categoryColor(item.category);
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 3),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 6, height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  Text('${item.quantity} ${item.unit} × ${fmt(item.unitPrice)} XOF',
                    style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            Text('${fmt(item.quantity * item.unitPrice)} XOF',
              style: TextStyle(fontWeight: FontWeight.w600, color: color, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _TotalRow({required this.label, required this.value, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500,
            color: bold ? Theme.of(context).colorScheme.primary : null)),
        ],
      ),
    );
  }
}
