import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
      ]);

      final mat = models.Material.fromJson(results[0] as Map<String, dynamic>);
      final cats = (results[1] as List).cast<Map<String, dynamic>>();

      setState(() {
        _material = mat;
        _categories = cats;
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
      await Supabase.instance.client.from('materials').delete().eq('id', widget.id);
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

  String _fmtNum(double v) => v % 1 == 0 ? v.toInt().toString() : v.toStringAsFixed(1);

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
    final categoryLabel = _categories.firstWhere(
      (c) => c['slug'] == m.category,
      orElse: () => {'label': m.category},
    )['label'] as String;

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
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            // Catégorie & unité
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Icon(Icons.category_outlined, size: 16, color: cs.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Text(categoryLabel,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurface)),
                    const SizedBox(width: 16),
                    Icon(Icons.straighten_outlined, size: 16, color: cs.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Text(m.unit,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurface)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Prix unitaire de référence
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Prix unitaire de référence',
                        style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
                    Text(
                      m.unitCost > 0 ? '${_fmtNum(m.unitCost)} / ${m.unit}' : 'Non défini',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),

            // Formulaire d'édition
            if (_editing) ...[
              const SizedBox(height: 20),
              Text('Modifier',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Nom *', prefixIcon: Icon(Icons.inventory_2_outlined)),
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
                      onChanged: (v) => setState(() => _editCategory = v ?? _editCategory),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _editUnit,
                      decoration: const InputDecoration(labelText: 'Unité'),
                      items: _kUnits
                          .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                          .toList(),
                      onChanged: (v) => setState(() => _editUnit = v ?? _editUnit),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _costCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                    labelText: 'Prix unitaire', prefixIcon: Icon(Icons.payments_outlined)),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              height: 18, width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
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
          ],
        ),
      ),
    );
  }
}
