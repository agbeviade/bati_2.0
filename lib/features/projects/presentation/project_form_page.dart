import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';

class ProjectFormPage extends StatefulWidget {
  final Project? project; // null = création, non-null = édition
  const ProjectFormPage({super.key, this.project});

  @override
  State<ProjectFormPage> createState() => _ProjectFormPageState();
}

class _ProjectFormPageState extends State<ProjectFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _budgetCtrl = TextEditingController();
  final _startCtrl = TextEditingController();
  final _endCtrl = TextEditingController();
  ProjectStatus _status = ProjectStatus.planned;
  int _progress = 0;
  bool _saving = false;

  bool get _isEdit => widget.project != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      final p = widget.project!;
      _nameCtrl.text = p.name;
      _addressCtrl.text = p.address ?? '';
      _descCtrl.text = p.description ?? '';
      _budgetCtrl.text = p.budget != null ? p.budget!.toStringAsFixed(0) : '';
      _startCtrl.text = p.startDate ?? '';
      _endCtrl.text = p.endDate ?? '';
      _status = p.status;
      _progress = p.progressPct;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    _descCtrl.dispose();
    _budgetCtrl.dispose();
    _startCtrl.dispose();
    _endCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(TextEditingController ctrl) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: ctrl.text.isNotEmpty ? DateTime.tryParse(ctrl.text) ?? now : now,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      ctrl.text = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser!.id;

      final profile = await client.from('users').select('company_id').eq('id', uid).single();
      final companyId = profile['company_id'] as String?;
      if (companyId == null) throw 'Aucune entreprise associée à ce compte';

      final payload = {
        'company_id': companyId,
        'name': _nameCtrl.text.trim(),
        'address': _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'budget': _budgetCtrl.text.trim().isEmpty ? null : double.tryParse(_budgetCtrl.text.trim()),
        'start_date': _startCtrl.text.trim().isEmpty ? null : _startCtrl.text.trim(),
        'end_date': _endCtrl.text.trim().isEmpty ? null : _endCtrl.text.trim(),
        'status': projectStatusToString(_status),
        'progress_pct': _progress,
      };

      if (_isEdit) {
        await client.from('projects').update(payload).eq('id', widget.project!.id);
      } else {
        await client.from('projects').insert(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEdit ? 'Chantier mis à jour' : 'Chantier créé')),
        );
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer le chantier ?'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('projects').delete().eq('id', widget.project!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chantier supprimé')));
        context.go('/projects');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Modifier le chantier' : 'Nouveau chantier'),
        actions: [
          if (_isEdit)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: _saving ? null : _delete,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Nom du chantier *', prefixIcon: Icon(Icons.construction_outlined)),
              validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _addressCtrl,
              decoration: const InputDecoration(labelText: 'Adresse', prefixIcon: Icon(Icons.location_on_outlined)),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<ProjectStatus>(
              // ignore: deprecated_member_use
              value: _status,
              decoration: const InputDecoration(labelText: 'Statut', prefixIcon: Icon(Icons.flag_outlined)),
              items: const [
                DropdownMenuItem(value: ProjectStatus.planned, child: Text('Planifié')),
                DropdownMenuItem(value: ProjectStatus.inProgress, child: Text('En cours')),
                DropdownMenuItem(value: ProjectStatus.paused, child: Text('Pausé')),
                DropdownMenuItem(value: ProjectStatus.completed, child: Text('Terminé')),
                DropdownMenuItem(value: ProjectStatus.canceled, child: Text('Annulé')),
              ],
              onChanged: (v) => setState(() => _status = v!),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text('Avancement : $_progress%', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(width: 8),
                Expanded(
                  child: Slider(
                    value: _progress.toDouble(),
                    min: 0,
                    max: 100,
                    divisions: 20,
                    label: '$_progress%',
                    onChanged: (v) => setState(() => _progress = v.round()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _budgetCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Budget (XOF)', prefixIcon: Icon(Icons.account_balance_wallet_outlined)),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _startCtrl,
                    readOnly: true,
                    onTap: () => _pickDate(_startCtrl),
                    decoration: const InputDecoration(labelText: 'Début', prefixIcon: Icon(Icons.calendar_today_outlined)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _endCtrl,
                    readOnly: true,
                    onTap: () => _pickDate(_endCtrl),
                    decoration: const InputDecoration(labelText: 'Fin prévue', prefixIcon: Icon(Icons.event_outlined)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description', prefixIcon: Icon(Icons.notes_outlined), alignLabelWithHint: true),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isEdit ? 'Enregistrer' : 'Créer le chantier'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
