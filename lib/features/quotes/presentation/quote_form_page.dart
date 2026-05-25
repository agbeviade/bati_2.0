import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../core/theme/app_theme.dart';

// ── Catégories de ligne ───────────────────────────────────────

const _kCategories = {
  'material':  'Matériaux',
  'labor':     'Main d\'œuvre',
  'transport': 'Transport',
  'equipment': 'Équipement',
  'other':     'Autre',
};

const _kUnits = ['u', 'm', 'm²', 'm³', 'kg', 't', 'L', 'sac', 'h', 'jour', 'forfait'];

// ── Ligne de devis locale ─────────────────────────────────────

class _ItemDraft {
  String? id;
  String category;
  final TextEditingController labelCtrl;
  final TextEditingController qtyCtrl;
  String unit;
  final TextEditingController priceCtrl;

  _ItemDraft({
    this.id,
    this.category = 'material',
    String label = '',
    String qty = '1',
    this.unit = 'u',
    String price = '',
  })  : labelCtrl = TextEditingController(text: label),
        qtyCtrl = TextEditingController(text: qty),
        priceCtrl = TextEditingController(text: price);

  double get qty => double.tryParse(qtyCtrl.text.replaceAll(',', '.')) ?? 0;
  double get unitPrice => double.tryParse(priceCtrl.text.replaceAll(',', '.').replaceAll(' ', '')) ?? 0;
  double get total => qty * unitPrice;

  void dispose() {
    labelCtrl.dispose();
    qtyCtrl.dispose();
    priceCtrl.dispose();
  }
}

// ── Page formulaire devis ─────────────────────────────────────

class QuoteFormPage extends StatefulWidget {
  final Quote? quote;
  const QuoteFormPage({super.key, this.quote});

  @override
  State<QuoteFormPage> createState() => _QuoteFormPageState();
}

class _QuoteFormPageState extends State<QuoteFormPage> {
  final _formKey = GlobalKey<FormState>();

  // Métadonnées
  final _clientCtrl = TextEditingController();
  final _typeCtrl = TextEditingController();
  final _surfaceCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  double _taxRate = 0.18;
  double _marginPct = 0;
  DateTime? _validUntil;
  String? _selectedProjectId;

  // Lignes
  final List<_ItemDraft> _items = [];

  bool _loading = true;
  bool _saving = false;
  List<Map<String, dynamic>> _projects = [];

  bool get _isEditing => widget.quote != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final q = widget.quote!;
      _clientCtrl.text = q.clientName ?? '';
      _typeCtrl.text = q.projectType ?? '';
      _surfaceCtrl.text = q.surfaceM2 != null ? q.surfaceM2!.toStringAsFixed(0) : '';
      _notesCtrl.text = q.notes ?? '';
      _taxRate = q.taxRate;
      _marginPct = q.marginPct;
      _selectedProjectId = q.projectId;
      if (q.validUntil != null) {
        try { _validUntil = DateTime.parse(q.validUntil!); } catch (_) {}
      }
    }
    _loadData();
  }

  @override
  void dispose() {
    _clientCtrl.dispose();
    _typeCtrl.dispose();
    _surfaceCtrl.dispose();
    _notesCtrl.dispose();
    for (final item in _items) { item.dispose(); }
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final client = Supabase.instance.client;
      final futures = <Future>[
        client.from('projects').select('id, name').inFilter('status', ['planned', 'in_progress']).order('name'),
      ];
      if (_isEditing) {
        futures.add(
          client.from('quote_items').select().eq('quote_id', widget.quote!.id).order('sort_order').order('created_at'),
        );
      }
      final results = await Future.wait(futures);
      setState(() {
        _projects = (results[0] as List).cast<Map<String, dynamic>>();
        if (_isEditing && results.length > 1) {
          for (final row in (results[1] as List).cast<Map<String, dynamic>>()) {
            _items.add(_ItemDraft(
              id: row['id'] as String?,
              category: row['category'] as String? ?? 'material',
              label: row['label'] as String? ?? '',
              qty: (row['quantity'] as num?)?.toStringAsFixed(2) ?? '1',
              unit: row['unit'] as String? ?? 'u',
              price: (row['unit_price'] as num?)?.toStringAsFixed(0) ?? '',
            ));
          }
        }
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  // ── Calculs ───────────────────────────────────────────────────

  double get _subtotal => _items.fold(0.0, (s, i) => s + i.total);
  double get _tva => _subtotal * _taxRate;
  double get _total => _subtotal + _tva;

  // ── Actions ───────────────────────────────────────────────────

  void _addItem() {
    setState(() => _items.add(_ItemDraft()));
  }

  void _removeItem(int index) {
    setState(() {
      _items[index].dispose();
      _items.removeAt(index);
    });
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _validUntil ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (d != null) setState(() => _validUntil = d);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser!.id;

      final clientName = _clientCtrl.text.trim().isEmpty ? null : _clientCtrl.text.trim();
      final projectType = _typeCtrl.text.trim().isEmpty ? null : _typeCtrl.text.trim();
      final surface = double.tryParse(_surfaceCtrl.text.trim());
      final notes = _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim();
      final validUntilStr = _validUntil?.toIso8601String().substring(0, 10);

      final meta = {
        'client_name': clientName,
        'project_type': projectType,
        'surface_m2': surface,
        'valid_until': validUntilStr,
        'tax_rate': _taxRate,
        'margin_pct': _marginPct,
        'notes': notes,
        'project_id': _selectedProjectId,
        'subtotal': _subtotal,
        'total': _total,
      };

      String quoteId;

      if (_isEditing) {
        quoteId = widget.quote!.id;
        await client.from('quotes').update(meta).eq('id', quoteId);
        // Supprimer toutes les lignes existantes et réinsérer
        await client.from('quote_items').delete().eq('quote_id', quoteId);
      } else {
        // Générer le numéro
        final profile = await client.from('users').select('company_id').eq('id', uid).single();
        final companyId = profile['company_id'] as String;
        final countResult = await client.from('quotes').select('id').eq('company_id', companyId).count();
        final count = countResult.count;
        final year = DateTime.now().year;
        final quoteNumber = 'DEVIS-$year-${(count + 1).toString().padLeft(3, '0')}';

        final inserted = await client.from('quotes').insert({
          ...meta,
          'company_id': companyId,
          'quote_number': quoteNumber,
          'created_by': uid,
          'status': 'draft',
        }).select('id').single();
        quoteId = inserted['id'] as String;
      }

      // Insérer les lignes
      if (_items.isNotEmpty) {
        await client.from('quote_items').insert(
          _items.asMap().entries.map((e) => {
            'quote_id': quoteId,
            'category': e.value.category,
            'label': e.value.labelCtrl.text.trim(),
            'quantity': e.value.qty,
            'unit': e.value.unit,
            'unit_price': e.value.unitPrice,
            'sort_order': e.key,
          }).toList(),
        );
      }

      if (mounted) {
        if (_isEditing) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Devis mis à jour')));
          context.pop(true);
        } else {
          context.go('/quotes/$quoteId');
        }
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

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Modifier le devis' : 'Nouveau devis'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Enregistrer', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Section Métadonnées ───────────────────────────
            _SectionHeader(title: 'Informations générales', icon: Icons.info_outline),
            const SizedBox(height: 10),

            _FieldLabel('Client'),
            TextFormField(
              controller: _clientCtrl,
              decoration: _deco(hint: 'Nom du client ou entreprise', icon: Icons.person_outline),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 12),

            _FieldLabel('Type de projet'),
            TextFormField(
              controller: _typeCtrl,
              decoration: _deco(hint: 'Construction, rénovation, carrelage...', icon: Icons.construction_outlined),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: 12),

            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _FieldLabel('Surface (m²)'),
                TextFormField(
                  controller: _surfaceCtrl,
                  decoration: _deco(hint: '0', suffix: 'm²'),
                  keyboardType: TextInputType.number,
                ),
              ])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _FieldLabel('Date de validité'),
                InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(8),
                  child: InputDecorator(
                    decoration: _deco(icon: Icons.event_outlined),
                    child: Text(
                      _validUntil != null
                          ? '${_validUntil!.day.toString().padLeft(2,'0')}/${_validUntil!.month.toString().padLeft(2,'0')}/${_validUntil!.year}'
                          : 'Sélectionner',
                      style: TextStyle(
                        fontSize: 14,
                        color: _validUntil != null
                            ? Theme.of(context).colorScheme.onSurface
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              ])),
            ]),
            const SizedBox(height: 12),

            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _FieldLabel('TVA (%)'),
                DropdownButtonFormField<double>(
                  value: _taxRate,
                  decoration: _deco(icon: Icons.percent_outlined),
                  items: const [
                    DropdownMenuItem(value: 0, child: Text('0%')),
                    DropdownMenuItem(value: 0.10, child: Text('10%')),
                    DropdownMenuItem(value: 0.18, child: Text('18%')),
                    DropdownMenuItem(value: 0.20, child: Text('20%')),
                  ],
                  onChanged: (v) => setState(() => _taxRate = v ?? 0.18),
                ),
              ])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _FieldLabel('Marge (%)'),
                DropdownButtonFormField<double>(
                  value: _marginPct,
                  decoration: _deco(icon: Icons.trending_up_outlined),
                  items: const [
                    DropdownMenuItem(value: 0, child: Text('0%')),
                    DropdownMenuItem(value: 0.05, child: Text('5%')),
                    DropdownMenuItem(value: 0.10, child: Text('10%')),
                    DropdownMenuItem(value: 0.15, child: Text('15%')),
                    DropdownMenuItem(value: 0.20, child: Text('20%')),
                    DropdownMenuItem(value: 0.25, child: Text('25%')),
                    DropdownMenuItem(value: 0.30, child: Text('30%')),
                  ],
                  onChanged: (v) => setState(() => _marginPct = v ?? 0),
                ),
              ])),
            ]),
            const SizedBox(height: 12),

            _FieldLabel('Chantier lié (optionnel)'),
            DropdownButtonFormField<String>(
              value: _selectedProjectId,
              decoration: _deco(icon: Icons.construction_outlined),
              items: [
                const DropdownMenuItem<String>(value: null, child: Text('Aucun')),
                ..._projects.map((p) => DropdownMenuItem<String>(
                      value: p['id'] as String,
                      child: Text(p['name'] as String, overflow: TextOverflow.ellipsis),
                    )),
              ],
              onChanged: (v) => setState(() => _selectedProjectId = v),
            ),
            const SizedBox(height: 12),

            _FieldLabel('Notes'),
            TextFormField(
              controller: _notesCtrl,
              decoration: _deco(hint: 'Conditions, remarques...', icon: Icons.notes_outlined),
              maxLines: 3,
              minLines: 2,
            ),

            // ── Section Lignes ────────────────────────────────
            const SizedBox(height: 24),
            _SectionHeader(
              title: 'Lignes du devis (${_items.length})',
              icon: Icons.list_alt_outlined,
              action: TextButton.icon(
                onPressed: _addItem,
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Ajouter'),
              ),
            ),
            const SizedBox(height: 8),

            if (_items.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 24),
                decoration: BoxDecoration(
                  border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                  borderRadius: BorderRadius.circular(10),
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                ),
                child: Column(children: [
                  Icon(Icons.add_box_outlined, size: 32, color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
                  const SizedBox(height: 8),
                  Text('Aucune ligne. Appuyez sur Ajouter.',
                      style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ]),
              )
            else
              ..._items.asMap().entries.map((entry) => _ItemRow(
                    key: ValueKey(entry.key),
                    item: entry.value,
                    index: entry.key,
                    onRemove: () => _removeItem(entry.key),
                    onChanged: () => setState(() {}),
                  )),

            // ── Totaux ────────────────────────────────────────
            if (_items.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientHero,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(children: [
                  _TotalRow(label: 'Sous-total HT', value: _fmtNum(_subtotal), white: false),
                  _TotalRow(label: 'TVA ${(_taxRate * 100).toStringAsFixed(0)}%', value: _fmtNum(_tva), white: false),
                  const Divider(color: Colors.white24, height: 16),
                  _TotalRow(label: 'TOTAL TTC', value: _fmtNum(_total), white: true, large: true),
                ]),
              ),
            ],

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check),
                label: Text(_saving ? 'Enregistrement...' : (_isEditing ? 'Enregistrer' : 'Créer le devis')),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _fmtNum(double v) => '${v.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+$)'), (m) => '${m[1]} ')} XOF';
}

// ── Widget ligne d'article ────────────────────────────────────

class _ItemRow extends StatefulWidget {
  final _ItemDraft item;
  final int index;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  const _ItemRow({
    super.key,
    required this.item,
    required this.index,
    required this.onRemove,
    required this.onChanged,
  });

  @override
  State<_ItemRow> createState() => _ItemRowState();
}

class _ItemRowState extends State<_ItemRow> {
  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final total = item.total;
    final cs = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // En-tête ligne : catégorie + supprimer
          Row(children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: item.category,
                isDense: true,
                decoration: InputDecoration(
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  filled: true,
                  fillColor: AppColors.primary.withValues(alpha: 0.06),
                ),
                items: _kCategories.entries.map((e) => DropdownMenuItem<String>(
                  value: e.key,
                  child: Text(e.value, style: const TextStyle(fontSize: 13)),
                )).toList(),
                onChanged: (v) {
                  setState(() => item.category = v ?? 'material');
                  widget.onChanged();
                },
              ),
            ),
            IconButton(
              icon: Icon(Icons.delete_outline, color: cs.onSurfaceVariant, size: 20),
              onPressed: widget.onRemove,
              visualDensity: VisualDensity.compact,
            ),
          ]),
          const SizedBox(height: 8),

          // Description
          TextFormField(
            controller: item.labelCtrl,
            decoration: InputDecoration(
              hintText: 'Description...',
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            textCapitalization: TextCapitalization.sentences,
            onChanged: (_) => widget.onChanged(),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Requis' : null,
          ),
          const SizedBox(height: 8),

          // Qté + Unité + Prix
          Row(children: [
            Expanded(
              flex: 2,
              child: TextFormField(
                controller: item.qtyCtrl,
                decoration: InputDecoration(
                  labelText: 'Qté',
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) { setState(() {}); widget.onChanged(); },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
              child: DropdownButtonFormField<String>(
                value: _kUnits.contains(item.unit) ? item.unit : 'u',
                isDense: true,
                decoration: InputDecoration(
                  labelText: 'Unité',
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: _kUnits.map((u) => DropdownMenuItem<String>(value: u, child: Text(u))).toList(),
                onChanged: (v) {
                  setState(() => item.unit = v ?? 'u');
                  widget.onChanged();
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: item.priceCtrl,
                decoration: InputDecoration(
                  labelText: 'Prix unit.',
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) { setState(() {}); widget.onChanged(); },
              ),
            ),
          ]),

          // Total ligne
          if (total > 0) ...[
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '= ${_fmtNum(total)} XOF',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary),
              ),
            ),
          ],
        ]),
      ),
    );
  }

  String _fmtNum(double v) => v.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+$)'), (m) => '${m[1]} ');
}

// ── Widgets helpers ───────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget? action;
  const _SectionHeader({required this.title, required this.icon, this.action});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 18, color: AppColors.primary),
      const SizedBox(width: 8),
      Expanded(child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600))),
      if (action != null) action!,
    ]);
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      );
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final bool white;
  final bool large;
  const _TotalRow({required this.label, required this.value, required this.white, this.large = false});

  @override
  Widget build(BuildContext context) {
    final color = white ? Colors.white : Colors.white70;
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(color: color, fontSize: large ? 15 : 13, fontWeight: large ? FontWeight.w600 : FontWeight.normal)),
      Text(value, style: TextStyle(color: Colors.white, fontSize: large ? 18 : 14, fontWeight: large ? FontWeight.bold : FontWeight.w500)),
    ]);
  }
}

InputDecoration _deco({String? hint, IconData? icon, String? suffix}) => InputDecoration(
      hintText: hint,
      prefixIcon: icon != null ? Icon(icon, size: 20) : null,
      suffixText: suffix,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
    );
