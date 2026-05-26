import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../core/theme/app_theme.dart';

class InvoiceFormPage extends StatefulWidget {
  final Invoice? invoice; // null = création, non-null = édition
  const InvoiceFormPage({super.key, this.invoice});

  @override
  State<InvoiceFormPage> createState() => _InvoiceFormPageState();
}

class _InvoiceFormPageState extends State<InvoiceFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _clientCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  bool _saving = false;
  bool _loadingProjects = true;
  DateTime? _dueDate;
  String? _selectedProjectId;
  List<Map<String, dynamic>> _projects = [];

  bool get _isEditing => widget.invoice != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final inv = widget.invoice!;
      _clientCtrl.text = inv.clientName ?? '';
      _amountCtrl.text = inv.amount > 0 ? inv.amount.toStringAsFixed(0) : '';
      _notesCtrl.text = inv.notes ?? '';
      _selectedProjectId = inv.projectId;
      if (inv.dueDate != null) {
        try { _dueDate = DateTime.parse(inv.dueDate!); } catch (_) {}
      }
    }
    _loadProjects();
  }

  @override
  void dispose() {
    _clientCtrl.dispose();
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProjects() async {
    try {
      final data = await Supabase.instance.client
          .from('projects')
          .select('id, name')
          .inFilter('status', ['planned', 'in_progress'])
          .order('name');
      setState(() {
        _projects = (data as List).cast<Map<String, dynamic>>();
        _loadingProjects = false;
      });
    } catch (_) {
      setState(() => _loadingProjects = false);
    }
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 3)),
    );
    if (d != null) setState(() => _dueDate = d);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser!.id;

      final clientName = _clientCtrl.text.trim().isEmpty ? null : _clientCtrl.text.trim();
      final amount = double.tryParse(_amountCtrl.text.replaceAll(',', '.').replaceAll(' ', '')) ?? 0;
      final notes = _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim();
      final dueDateStr = _dueDate?.toIso8601String().substring(0, 10);

      if (_isEditing) {
        await client.from('invoices').update({
          'client_name': clientName,
          'amount': amount,
          'due_date': dueDateStr,
          'notes': notes,
          'project_id': _selectedProjectId,
        }).eq('id', widget.invoice!.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Facture mise à jour')));
          context.pop(true);
        }
      } else {
        // Récupère company_id et génère le numéro
        final profile = await client.from('users').select('company_id').eq('id', uid).single();
        final companyId = profile['company_id'] as String;

        final countResult = await client
            .from('invoices')
            .select('id')
            .eq('company_id', companyId)
            .count();
        final count = countResult.count;
        final year = DateTime.now().year;
        final invoiceNumber = 'FAC-$year-${(count + 1).toString().padLeft(3, '0')}';

        final inserted = await client.from('invoices').insert({
          'company_id': companyId,
          'invoice_number': invoiceNumber,
          'client_name': clientName,
          'amount': amount,
          'due_date': dueDateStr,
          'notes': notes,
          'project_id': _selectedProjectId,
          'created_by': uid,
          'status': 'draft',
        }).select('id').single();

        if (mounted) {
          context.go('/invoices/${inserted['id']}');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Modifier la facture' : 'Nouvelle facture'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Client
            _SectionLabel(label: 'Client'),
            TextFormField(
              controller: _clientCtrl,
              decoration: _deco(hint: 'Nom du client ou entreprise', icon: Icons.person_outline),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 16),

            // Montant
            _SectionLabel(label: 'Montant *'),
            TextFormField(
              controller: _amountCtrl,
              decoration: _deco(hint: '0', icon: Icons.payments_outlined, suffix: 'XOF'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Montant requis';
                final n = double.tryParse(v.replaceAll(',', '.').replaceAll(' ', ''));
                if (n == null || n <= 0) return 'Montant invalide';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Date d'échéance
            _SectionLabel(label: 'Date d\'échéance'),
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(8),
              child: InputDecorator(
                decoration: _deco(icon: Icons.event_outlined),
                child: Text(
                  _dueDate != null
                      ? '${_dueDate!.day.toString().padLeft(2, '0')}/${_dueDate!.month.toString().padLeft(2, '0')}/${_dueDate!.year}'
                      : 'Sélectionner une date',
                  style: TextStyle(
                    color: _dueDate != null
                        ? Theme.of(context).colorScheme.onSurface
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Chantier lié
            _SectionLabel(label: 'Chantier lié (optionnel)'),
            if (_loadingProjects)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
              )
            else
              DropdownButtonFormField<String>(
                initialValue: _selectedProjectId,
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
            const SizedBox(height: 16),

            // Notes
            _SectionLabel(label: 'Notes'),
            TextFormField(
              controller: _notesCtrl,
              decoration: _deco(hint: 'Informations complémentaires...', icon: Icons.notes_outlined),
              maxLines: 3,
              minLines: 2,
            ),
            const SizedBox(height: 28),

            // Bouton enregistrer
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.check),
                label: Text(_saving ? 'Enregistrement...' : (_isEditing ? 'Enregistrer' : 'Créer la facture')),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
    );
  }
}

InputDecoration _deco({String? hint, IconData? icon, String? suffix}) => InputDecoration(
      hintText: hint,
      prefixIcon: icon != null ? Icon(icon, size: 20) : null,
      suffixText: suffix,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    );
