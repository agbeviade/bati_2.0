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
  // Only purchase/adjustment here — exits (use/return) are done from the project detail
  models.MovementType _type = models.MovementType.purchase;
  String? _materialId;
  bool _saving = false;
  List<Map<String, dynamic>> _materials = [];

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
    final data = await Supabase.instance.client
        .from('materials')
        .select('id, name, unit, stock_qty')
        .order('name');
    setState(() {
      _materials = (data as List).cast<Map<String, dynamic>>();
    });
  }

  String _typeLabel(models.MovementType t) => switch (t) {
        models.MovementType.purchase => 'Achat / Réception',
        models.MovementType.adjustment => 'Correction de stock',
        _ => 'Achat',
      };

  String _typeDb(models.MovementType t) => switch (t) {
        models.MovementType.purchase => 'purchase',
        models.MovementType.adjustment => 'adjustment',
        _ => 'purchase',
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
      appBar: AppBar(title: const Text('Achat & ajustement stock')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Info banner
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, size: 16, color: Color(0xFF2563EB)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Les sorties chantier se saisissent depuis l\'onglet Matériaux de chaque chantier.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8)),
                    ),
                  ),
                ],
              ),
            ),
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
              items: [models.MovementType.purchase, models.MovementType.adjustment]
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
