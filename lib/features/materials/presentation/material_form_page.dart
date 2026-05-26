import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';

const _kUnits = ['u', 'kg', 't', 'm', 'm²', 'm³', 'L', 'ml', 'sac', 'barre', 'planche', 'rouleau', 'boîte'];

class MaterialFormPage extends StatefulWidget {
  const MaterialFormPage({super.key});

  @override
  State<MaterialFormPage> createState() => _MaterialFormPageState();
}

class _MaterialFormPageState extends State<MaterialFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  String _unit = 'u';
  String? _categorySlug;
  List<Map<String, dynamic>> _categories = [];
  bool _loadingCats = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _costCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;
      final data = await Supabase.instance.client
          .from('material_categories')
          .select('slug, label')
          .eq('company_id', companyId)
          .order('label');
      setState(() {
        _categories = (data as List).cast<Map<String, dynamic>>();
        if (_categories.isNotEmpty) _categorySlug = _categories.first['slug'] as String;
        _loadingCats = false;
      });
    } catch (_) {
      setState(() => _loadingCats = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;

      final inserted = await Supabase.instance.client
          .from('materials')
          .insert({
            'company_id': companyId,
            'name': _nameCtrl.text.trim(),
            'category': _categorySlug ?? 'other',
            'unit': _unit,
            'unit_cost': double.tryParse(_costCtrl.text.trim()) ?? 0,
            'stock_qty': 0,
          })
          .select('id')
          .single();

      if (mounted) context.pop(inserted['id'] as String);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nouveau matériau')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                  labelText: 'Nom *',
                  prefixIcon: Icon(Icons.inventory_2_outlined),
                  hintText: 'ex: Ciment Portland'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Requis' : null,
            ),
            const SizedBox(height: 16),
            if (_loadingCats)
              const LinearProgressIndicator()
            else if (_categories.isNotEmpty)
              DropdownButtonFormField<String>(
                initialValue: _categorySlug,
                decoration: const InputDecoration(
                    labelText: 'Catégorie',
                    prefixIcon: Icon(Icons.category_outlined)),
                items: _categories
                    .map((c) => DropdownMenuItem<String>(
                          value: c['slug'] as String,
                          child: Text(c['label'] as String),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _categorySlug = v),
              ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _unit,
              decoration: const InputDecoration(
                  labelText: 'Unité',
                  prefixIcon: Icon(Icons.straighten_outlined)),
              items: _kUnits
                  .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                  .toList(),
              onChanged: (v) => setState(() => _unit = v ?? _unit),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _costCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                  labelText: 'Prix unitaire',
                  prefixIcon: Icon(Icons.payments_outlined),
                  hintText: 'ex: 5000'),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Créer le matériau'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => context.pop(),
              child: const Text('Annuler'),
            ),
          ],
        ),
      ),
    );
  }
}
