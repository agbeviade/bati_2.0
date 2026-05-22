import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart' as models;

class MovementFormPage extends StatefulWidget {
  final String? materialId; // null = choisir dans la liste
  final String? materialName;
  const MovementFormPage({super.key, this.materialId, this.materialName});

  @override
  State<MovementFormPage> createState() => _MovementFormPageState();
}

class _MovementFormPageState extends State<MovementFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _qtyCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  models.MovementType _type = models.MovementType.use;
  String? _materialId;
  String? _projectId;
  bool _saving = false;
  List<Map<String, dynamic>> _materials = [];
  List<Map<String, dynamic>> _projects = [];

  @override
  void initState() {
    super.initState();
    _materialId = widget.materialId;
    _loadData();
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final client = Supabase.instance.client;
    final results = await Future.wait<dynamic>([
      client.from('materials').select('id, name, unit, stock_qty').order('name'),
      client.from('projects').select('id, name').inFilter('status', ['in_progress', 'planned']).order('name'),
    ]);
    setState(() {
      _materials = (results[0] as List).cast<Map<String, dynamic>>();
      _projects = (results[1] as List).cast<Map<String, dynamic>>();
    });
  }

  String _typeLabel(models.MovementType t) => switch (t) {
        models.MovementType.purchase => 'Achat / Réception',
        models.MovementType.use => 'Utilisation chantier',
        models.MovementType.returnItem => 'Retour stock',
        models.MovementType.adjustment => 'Ajustement inventaire',
      };

  String _typeDb(models.MovementType t) => switch (t) {
        models.MovementType.purchase => 'purchase',
        models.MovementType.use => 'use',
        models.MovementType.returnItem => 'return',
        models.MovementType.adjustment => 'adjustment',
      };

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_materialId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sélectionnez un matériau'), backgroundColor: Colors.red));
      return;
    }
    setState(() => _saving = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      await Supabase.instance.client.from('stock_movements').insert({
        'material_id': _materialId,
        'project_id': _projectId,
        'type': _typeDb(_type),
        'quantity': double.parse(_qtyCtrl.text.trim()),
        'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
        'created_by': uid,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Mouvement enregistré')));
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedMaterial = _materialId != null
        ? _materials.where((m) => m['id'] == _materialId).firstOrNull
        : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Mouvement de stock')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.materialId == null)
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _materialId,
                decoration: const InputDecoration(labelText: 'Matériau *', prefixIcon: Icon(Icons.inventory_2_outlined)),
                items: _materials.map((m) => DropdownMenuItem(
                  value: m['id'] as String,
                  child: Text('${m['name']} (${(m['stock_qty'] as num).toStringAsFixed(1)} ${m['unit']})'),
                )).toList(),
                onChanged: (v) => setState(() => _materialId = v),
                validator: (v) => v == null ? 'Requis' : null,
              ),
            if (widget.materialId != null && selectedMaterial != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.inventory_2_outlined, color: Theme.of(context).colorScheme.onPrimaryContainer),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(selectedMaterial['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text('Stock actuel : ${(selectedMaterial['stock_qty'] as num).toStringAsFixed(1)} ${selectedMaterial['unit']}',
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            DropdownButtonFormField<models.MovementType>(
              // ignore: deprecated_member_use
              value: _type,
              decoration: const InputDecoration(labelText: 'Type de mouvement', prefixIcon: Icon(Icons.swap_vert)),
              items: models.MovementType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(_typeLabel(t))))
                  .toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _qtyCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Quantité *', prefixIcon: Icon(Icons.numbers)),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Requis';
                if (double.tryParse(v.trim()) == null) return 'Nombre invalide';
                if (double.parse(v.trim()) <= 0) return 'Doit être > 0';
                return null;
              },
            ),
            const SizedBox(height: 12),
            if (_type == models.MovementType.use || _type == models.MovementType.returnItem) ...[
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _projectId,
                decoration: const InputDecoration(labelText: 'Chantier concerné', prefixIcon: Icon(Icons.construction_outlined)),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Aucun')),
                  ..._projects.map((p) => DropdownMenuItem(value: p['id'] as String, child: Text(p['name'] as String))),
                ],
                onChanged: (v) => setState(() => _projectId = v),
              ),
              const SizedBox(height: 12),
            ],
            TextFormField(
              controller: _notesCtrl,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Notes', prefixIcon: Icon(Icons.notes_outlined), alignLabelWithHint: true),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Enregistrer le mouvement'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
