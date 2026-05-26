import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../shared/models/models.dart' as models;
import '../../../core/theme/app_theme.dart';

const _kUnits = ['u', 'kg', 't', 'm', 'm²', 'm³', 'L', 'ml', 'sac', 'barre', 'planche', 'rouleau', 'boîte'];

class MaterialDetailPage extends StatefulWidget {
  final String id;
  const MaterialDetailPage({super.key, required this.id});

  @override
  State<MaterialDetailPage> createState() => _MaterialDetailPageState();
}

class _MaterialDetailPageState extends State<MaterialDetailPage> {
  bool _loading = true;
  models.Material? _material;
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _movements = [];

  bool _editing = false;
  bool _saving = false;
  final _nameCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  String _editCategory = '';
  String _editUnit = 'u';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _costCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait<dynamic>([
        client.from('materials').select().eq('id', widget.id).single(),
        client.from('material_categories').select('slug, label').order('label'),
        client.from('stock_movements')
            .select('id, type, quantity, unit_cost, notes, created_at')
            .eq('material_id', widget.id)
            .inFilter('type', ['purchase', 'adjustment'])
            .order('created_at', ascending: false)
            .limit(50),
      ]);

      final mat = models.Material.fromJson(results[0] as Map<String, dynamic>);
      final cats = (results[1] as List).cast<Map<String, dynamic>>();

      setState(() {
        _material = mat;
        _categories = cats;
        _movements = (results[2] as List).cast<Map<String, dynamic>>();
        _nameCtrl.text = mat.name;
        _costCtrl.text = mat.unitCost > 0 ? '${mat.unitCost.toInt()}' : '';
        _editCategory = mat.category;
        _editUnit = mat.unit;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('materials').update({
        'name': _nameCtrl.text.trim(),
        'category': _editCategory,
        'unit': _editUnit,
        'unit_cost': double.tryParse(_costCtrl.text.trim()) ?? 0,
      }).eq('id', widget.id);
      await _load();
      setState(() => _editing = false);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Matériau mis à jour')));
      }
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce matériau ?'),
        content: const Text(
            'Cette action est irréversible. L\'historique des mouvements sera également supprimé.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Annuler')),
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
      await Supabase.instance.client
          .from('materials')
          .delete()
          .eq('id', widget.id);
      if (mounted) context.pop(true);
    } catch (e) {
      _showError(e);
    }
  }

  void _showError(Object e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
    );
  }

  String _fmtNum(double v) =>
      v % 1 == 0 ? v.toInt().toString() : v.toStringAsFixed(1);

  String _movLabel(String type) => switch (type) {
        'purchase' => 'Achat',
        'adjustment' => 'Ajustement',
        _ => type,
      };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_material == null) {
      return Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('Matériau introuvable')));
    }
    final m = _material!;
    final stockValue = m.stockQty * m.unitCost;
    final isLowStock = m.stockQty <= 0;

    return Scaffold(
      appBar: AppBar(
        title: Text(m.name),
        actions: [
          IconButton(
            icon: Icon(_editing ? Icons.close : Icons.edit_outlined),
            tooltip: _editing ? 'Annuler' : 'Modifier',
            onPressed: () => setState(() => _editing = !_editing),
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'delete') _delete();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  leading: Icon(Icons.delete_outline, color: Colors.red),
                  title: Text('Supprimer', style: TextStyle(color: Colors.red)),
                  dense: true,
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add_shopping_cart_outlined),
        label: const Text('Achat / Ajustement'),
        onPressed: () async {
          final done = await context.push(
            '/materials/movement',
            extra: {'materialId': m.id, 'materialName': m.name},
          );
          if (done == true) _load();
        },
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // ── KPI cards ────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: _KpiCard(
                    label: 'Stock (${m.unit})',
                    value: _fmtNum(m.stockQty),
                    color: isLowStock ? AppColors.red : AppColors.green,
                    icon: Icons.inventory_2_outlined,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _KpiCard(
                    label: 'Prix / ${m.unit}',
                    value: _fmtNum(m.unitCost),
                    color: cs.primary,
                    icon: Icons.payments_outlined,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _KpiCard(
                    label: 'Valeur stock',
                    value: _fmtNum(stockValue),
                    color: const Color(0xFF7C3AED),
                    icon: Icons.account_balance_wallet_outlined,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    Icon(Icons.category_outlined, size: 16, color: cs.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Text(
                      _categories.firstWhere(
                        (c) => c['slug'] == m.category,
                        orElse: () => {'label': m.category},
                      )['label'] as String,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurface),
                    ),
                    const SizedBox(width: 16),
                    Icon(Icons.straighten_outlined, size: 16, color: cs.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Text(m.unit,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurface)),
                  ],
                ),
              ),
            ),
            if (isLowStock) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.red.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.red.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_outlined,
                        size: 16, color: AppColors.red),
                    const SizedBox(width: 8),
                    Text('Stock épuisé',
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.red,
                            fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ],

            // ── Edit form ────────────────────────────────────────
            if (_editing) ...[
              const SizedBox(height: 20),
              Text('Modifier',
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Nom *',
                    prefixIcon: Icon(Icons.inventory_2_outlined)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _editCategory,
                      decoration: const InputDecoration(labelText: 'Catégorie'),
                      items: _categories
                          .map((c) => DropdownMenuItem<String>(
                                value: c['slug'] as String,
                                child: Text(c['label'] as String,
                                    overflow: TextOverflow.ellipsis),
                              ))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _editCategory = v ?? _editCategory),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _editUnit,
                      decoration: const InputDecoration(labelText: 'Unité'),
                      items: _kUnits
                          .map((u) =>
                              DropdownMenuItem(value: u, child: Text(u)))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _editUnit = v ?? _editUnit),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _costCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                    labelText: 'Prix unitaire',
                    prefixIcon: Icon(Icons.payments_outlined)),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Enregistrer'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _editing = false),
                      child: const Text('Annuler'),
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 24),

            // ── Movements history ────────────────────────────────
            Row(
              children: [
                Text('Historique (achats & ajustements)',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),

            if (_movements.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                      'Aucun mouvement enregistré.',
                      style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13),
                    ),
                  ),
                ),
              )
            else
              Card(
                child: Column(
                  children: _movements.map((mv) {
                    final type = mv['type'] as String;
                    final qty = (mv['quantity'] as num).toDouble();
                    final cost = (mv['unit_cost'] as num?)?.toDouble() ?? 0;
                    final note = mv['notes'] as String?;
                    final createdAt = DateTime.parse(mv['created_at'] as String).toLocal();
                    final isPositive = type == 'purchase' || (type == 'adjustment' && qty >= 0);
                    final qtyColor = isPositive ? AppColors.green : AppColors.red;

                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        radius: 16,
                        backgroundColor: (isPositive ? AppColors.green : AppColors.red)
                            .withValues(alpha: 0.12),
                        child: Icon(
                          type == 'purchase'
                              ? Icons.add_shopping_cart_outlined
                              : Icons.tune_outlined,
                          size: 14,
                          color: isPositive ? AppColors.green : AppColors.red,
                        ),
                      ),
                      title: Text(
                        _movLabel(type),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                      subtitle: Text(
                        [
                          timeago.format(createdAt, locale: 'fr'),
                          if (note != null && note.isNotEmpty) note,
                        ].join(' · '),
                        style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${qty >= 0 ? '+' : ''}${_fmtNum(qty)} ${m.unit}',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: qtyColor),
                          ),
                          if (cost > 0)
                            Text(
                              '${_fmtNum(cost)} / ${m.unit}',
                              style: TextStyle(
                                  fontSize: 11, color: cs.onSurfaceVariant),
                            ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  const _KpiCard(
      {required this.label,
      required this.value,
      required this.color,
      required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 6),
            Text(value,
                style: TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
