import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../core/theme/app_theme.dart';

class TeamFormPage extends StatefulWidget {
  final Team? team;
  const TeamFormPage({super.key, this.team});

  @override
  State<TeamFormPage> createState() => _TeamFormPageState();
}

class _TeamFormPageState extends State<TeamFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  String? _leadId;
  List<Map<String, dynamic>> _workers = [];
  bool _loadingWorkers = true;
  bool _saving = false;

  bool get _isEdit => widget.team != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      _nameCtrl.text = widget.team!.name;
      _leadId = widget.team!.leadId;
    }
    _loadWorkers();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadWorkers() async {
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;
      final data = await Supabase.instance.client
          .from('users')
          .select('id, full_name, role')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .neq('role', 'client')
          .order('full_name');
      setState(() {
        _workers = (data as List).cast<Map<String, dynamic>>();
        _loadingWorkers = false;
      });
    } catch (_) {
      setState(() => _loadingWorkers = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      if (_isEdit) {
        await Supabase.instance.client.from('teams').update({
          'name': _nameCtrl.text.trim(),
          'lead_id': _leadId,
        }).eq('id', widget.team!.id);
        if (mounted) context.pop(true);
      } else {
        final uid = Supabase.instance.client.auth.currentUser!.id;
        final profile = await Supabase.instance.client
            .from('users')
            .select('company_id')
            .eq('id', uid)
            .single();
        final companyId = profile['company_id'] as String;
        final inserted = await Supabase.instance.client
            .from('teams')
            .insert({
              'company_id': companyId,
              'name': _nameCtrl.text.trim(),
              'lead_id': _leadId,
            })
            .select('id')
            .single();
        if (mounted) context.pop(inserted['id'] as String);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Modifier l\'équipe' : 'Nouvelle équipe')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Nom de l\'équipe *',
                prefixIcon: Icon(Icons.groups_outlined),
                hintText: 'ex: Équipe Maçonnerie A',
              ),
              textCapitalization: TextCapitalization.words,
              validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
            ),
            const SizedBox(height: 16),
            _loadingWorkers
                ? const LinearProgressIndicator()
                : DropdownButtonFormField<String>(
                    value: _leadId,
                    decoration: const InputDecoration(
                      labelText: 'Chef d\'équipe',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    items: [
                      const DropdownMenuItem<String>(value: null, child: Text('Aucun')),
                      ..._workers.map((w) => DropdownMenuItem<String>(
                            value: w['id'] as String,
                            child: Text(w['full_name'] as String? ?? 'Sans nom'),
                          )),
                    ],
                    onChanged: (v) => setState(() => _leadId = v),
                  ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(_isEdit ? 'Enregistrer' : 'Créer l\'équipe'),
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
