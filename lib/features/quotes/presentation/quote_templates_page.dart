import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';

const _kCategories = [
  ('maison_basse', 'Maison basse (RDC)'),
  ('duplex', 'Duplex (R+1)'),
  ('immeuble_r2', 'Immeuble (R+2)'),
  ('immeuble_r3', 'Immeuble (R+3 et +)'),
  ('villa_piscine', 'Villa avec piscine'),
  ('commercial', 'Bâtiment commercial'),
  ('boutique', 'Boutique / Kiosque'),
  ('entrepot', 'Entrepôt / Hangar'),
  ('cloture', 'Clôture et portail'),
  ('renovation', 'Rénovation / Finitions'),
  ('toiture', 'Charpente / Toiture'),
  ('assainissement', 'VRD / Assainissement'),
  ('fondations', 'Fondations spéciales'),
  ('autre', 'Autre'),
];

String _catLabel(String v) =>
    _kCategories.firstWhere((c) => c.$1 == v, orElse: () => (v, v)).$2;

String _mimeType(String ext) => switch (ext.toLowerCase()) {
      'pdf' => 'application/pdf',
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'application/octet-stream',
    };

class _Template {
  final String id;
  final String name;
  final String category;
  final String? description;
  final String fileType;
  final String storagePath;

  _Template({
    required this.id,
    required this.name,
    required this.category,
    this.description,
    required this.fileType,
    required this.storagePath,
  });

  factory _Template.fromJson(Map<String, dynamic> j) => _Template(
        id: j['id'] as String,
        name: j['name'] as String,
        category: j['category'] as String? ?? 'autre',
        description: j['description'] as String?,
        fileType: j['file_type'] as String? ?? 'pdf',
        storagePath: j['storage_path'] as String,
      );
}

class QuoteTemplatesPage extends StatefulWidget {
  const QuoteTemplatesPage({super.key});

  @override
  State<QuoteTemplatesPage> createState() => _QuoteTemplatesPageState();
}

class _QuoteTemplatesPageState extends State<QuoteTemplatesPage> {
  bool _loading = true;
  List<_Template> _templates = [];
  String _filterCat = 'all';
  bool _showForm = false;

  // Upload form state
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _selectedCat = 'maison_basse';
  PlatformFile? _pickedFile;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client
          .from('quote_templates')
          .select('id, name, category, description, file_type, storage_path')
          .order('category')
          .order('name');
      setState(() {
        _templates = (data as List)
            .cast<Map<String, dynamic>>()
            .map(_Template.fromJson)
            .toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
      withData: true,
    );
    if (result != null && result.files.isNotEmpty) {
      setState(() => _pickedFile = result.files.first);
    }
  }

  Future<void> _upload() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      _showError('Le nom est requis.');
      return;
    }
    if (_pickedFile == null || _pickedFile!.bytes == null) {
      _showError('Choisissez un fichier PDF, JPG ou PNG.');
      return;
    }
    final bytes = _pickedFile!.bytes!;
    if (bytes.lengthInBytes > 20 * 1024 * 1024) {
      _showError('Fichier trop lourd (max 20 Mo).');
      return;
    }

    setState(() => _uploading = true);
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;

      final userData =
          await client.from('users').select('company_id').eq('id', uid).single();
      final companyId = userData['company_id'] as String;

      final ext = _pickedFile!.extension?.toLowerCase() ?? 'pdf';
      final fileType = ext == 'pdf' ? 'pdf' : 'image';
      final mime = _mimeType(ext);
      final safeName = name.replaceAll(RegExp(r'[^a-z0-9]', caseSensitive: false), '_');
      final storagePath =
          '$companyId/${DateTime.now().millisecondsSinceEpoch}-$safeName.$ext';

      await client.storage.from('quote-templates').uploadBinary(
            storagePath,
            bytes,
            fileOptions: FileOptions(contentType: mime, upsert: false),
          );

      await client.from('quote_templates').insert({
        'company_id': companyId,
        'name': name,
        'category': _selectedCat,
        'description':
            _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'storage_path': storagePath,
        'file_type': fileType,
        'mime_type': mime,
      });

      _nameCtrl.clear();
      _descCtrl.clear();
      setState(() {
        _pickedFile = null;
        _showForm = false;
        _uploading = false;
      });
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Modèle ajouté.')));
      }
    } catch (e) {
      setState(() => _uploading = false);
      _showError('Erreur : $e');
    }
  }

  Future<void> _delete(_Template tpl) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce modèle ?'),
        content: Text('« ${tpl.name} » sera supprimé définitivement.'),
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
      final client = Supabase.instance.client;
      await client.storage
          .from('quote-templates')
          .remove([tpl.storagePath]);
      await client.from('quote_templates').delete().eq('id', tpl.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Modèle supprimé.')));
      }
    } catch (e) {
      _showError('Erreur : $e');
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.red));
  }

  List<_Template> get _filtered =>
      _filterCat == 'all' ? _templates : _templates.where((t) => t.category == _filterCat).toList();

  List<String> get _usedCats =>
      _templates.map((t) => t.category).toSet().toList()..sort();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filtered = _filtered;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Modèles de devis'),
        actions: [
          IconButton(
            icon: Icon(_showForm ? Icons.close : Icons.add),
            tooltip: _showForm ? 'Annuler' : 'Ajouter un modèle',
            onPressed: () => setState(() => _showForm = !_showForm),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // ── Formulaire d'upload ───────────────────────────
                  if (_showForm) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Nouveau modèle',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _nameCtrl,
                              decoration: const InputDecoration(
                                  labelText: 'Nom du modèle *',
                                  hintText: 'Ex : Villa R+1 Cocody',
                                  prefixIcon: Icon(Icons.description_outlined)),
                            ),
                            const SizedBox(height: 12),
                            DropdownButtonFormField<String>(
                              initialValue: _selectedCat,
                              decoration: const InputDecoration(
                                  labelText: 'Catégorie *',
                                  prefixIcon: Icon(Icons.category_outlined)),
                              items: _kCategories
                                  .map((c) => DropdownMenuItem(
                                      value: c.$1, child: Text(c.$2)))
                                  .toList(),
                              onChanged: (v) =>
                                  setState(() => _selectedCat = v ?? _selectedCat),
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _descCtrl,
                              decoration: const InputDecoration(
                                  labelText: 'Description (optionnel)',
                                  hintText: 'Ex : Villa 4 pièces 120m²',
                                  prefixIcon: Icon(Icons.notes_outlined)),
                            ),
                            const SizedBox(height: 12),
                            // File picker button
                            GestureDetector(
                              onTap: _pickFile,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: _pickedFile != null
                                        ? AppColors.green
                                        : cs.outline,
                                    width: _pickedFile != null ? 1.5 : 1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  color: _pickedFile != null
                                      ? AppColors.green.withValues(alpha: 0.05)
                                      : null,
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      _pickedFile != null
                                          ? Icons.check_circle_outline
                                          : Icons.upload_file_outlined,
                                      color: _pickedFile != null
                                          ? AppColors.green
                                          : cs.onSurfaceVariant,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        _pickedFile != null
                                            ? _pickedFile!.name
                                            : 'Choisir un fichier PDF, JPG ou PNG (max 20 Mo)',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: _pickedFile != null
                                              ? cs.onSurface
                                              : cs.onSurfaceVariant,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (_pickedFile != null)
                                      IconButton(
                                        icon: const Icon(Icons.close, size: 18),
                                        onPressed: () =>
                                            setState(() => _pickedFile = null),
                                        color: cs.onSurfaceVariant,
                                        visualDensity: VisualDensity.compact,
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(children: [
                              Expanded(
                                child: FilledButton.icon(
                                  onPressed: _uploading ? null : _upload,
                                  icon: _uploading
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                              strokeWidth: 2, color: Colors.white))
                                      : const Icon(Icons.upload_outlined, size: 18),
                                  label: Text(
                                      _uploading ? 'Envoi...' : 'Ajouter le modèle'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              OutlinedButton(
                                onPressed: () =>
                                    setState(() => _showForm = false),
                                child: const Text('Annuler'),
                              ),
                            ]),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // ── Filtres catégorie ─────────────────────────────
                  if (_templates.isNotEmpty) ...[
                    SizedBox(
                      height: 36,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _FilterChip(
                            label: 'Tous (${_templates.length})',
                            selected: _filterCat == 'all',
                            onTap: () => setState(() => _filterCat = 'all'),
                          ),
                          ..._usedCats.map((cat) => _FilterChip(
                                label:
                                    '${_catLabel(cat)} (${_templates.where((t) => t.category == cat).length})',
                                selected: _filterCat == cat,
                                onTap: () => setState(() => _filterCat = cat),
                              )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // ── Liste / État vide ─────────────────────────────
                  if (!_loading && _templates.isEmpty)
                    _EmptyState(onAdd: () => setState(() => _showForm = true))
                  else if (filtered.isEmpty && _templates.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: Text('Aucun modèle dans cette catégorie.',
                            style: TextStyle(color: cs.onSurfaceVariant)),
                      ),
                    )
                  else
                    ...filtered.map((tpl) => _TemplateCard(
                          tpl: tpl,
                          onDelete: () => _delete(tpl),
                        )),

                  // ── Info footer ───────────────────────────────────
                  if (_templates.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Comment utiliser les modèles ?',
                              style: const TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(
                            'Dans Nouveau devis, sélectionnez un modèle dans la section IA. L\'IA lira votre modèle et générera un devis adapté à votre projet.',
                            style: TextStyle(
                                fontSize: 11, color: cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}

// ── Widgets ───────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            color: selected ? Colors.white : cs.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _TemplateCard extends StatelessWidget {
  final _Template tpl;
  final VoidCallback onDelete;
  const _TemplateCard({required this.tpl, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isPdf = tpl.fileType == 'pdf';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isPdf
                    ? const Color(0xFFFFE5E5)
                    : const Color(0xFFE5F0FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isPdf ? Icons.picture_as_pdf_outlined : Icons.image_outlined,
                color: isPdf
                    ? const Color(0xFFEF4444)
                    : const Color(0xFF3B82F6),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tpl.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 13),
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _catLabel(tpl.category),
                      style: TextStyle(
                          fontSize: 10,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                  if (tpl.description != null && tpl.description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(tpl.description!,
                        style: TextStyle(
                            fontSize: 11, color: cs.onSurfaceVariant),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                  ],
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, size: 20),
              color: cs.onSurfaceVariant,
              onPressed: onDelete,
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: cs.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.description_outlined,
                size: 40, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          const Text('Aucun modèle de devis',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          const SizedBox(height: 6),
          Text(
            'Ajoutez des modèles PDF ou image pour que\nl\'IA génère des devis précis basés sur vos références.',
            style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: onAdd,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Ajouter votre premier modèle'),
          ),
        ],
      ),
    );
  }
}
