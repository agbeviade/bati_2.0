import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../core/theme/app_theme.dart';

const _kCurrencies = [
  ('XOF', 'XOF — Franc CFA (UEMOA)'),
  ('XAF', 'XAF — Franc CFA (CEMAC)'),
  ('MAD', 'MAD — Dirham marocain'),
  ('EUR', 'EUR — Euro'),
  ('USD', 'USD — Dollar américain'),
  ('GHS', 'GHS — Cedi ghanéen'),
  ('NGN', 'NGN — Naira nigérian'),
];

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _loading = true;
  AppUser? _user;
  Company? _company;

  // Profile
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _specialtyCtrl = TextEditingController();
  final _dailyRateCtrl = TextEditingController();
  bool _savingProfile = false;

  // Password
  final _newPwCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();
  bool _savingPw = false;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  // Company
  final _coNameCtrl = TextEditingController();
  final _coAddressCtrl = TextEditingController();
  final _coPhoneCtrl = TextEditingController();
  final _coEmailCtrl = TextEditingController();
  String _currency = 'XOF';
  bool _savingCompany = false;

  // Assets
  bool _uploadingHeader = false;
  bool _uploadingFooter = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _specialtyCtrl.dispose();
    _dailyRateCtrl.dispose();
    _newPwCtrl.dispose();
    _confirmPwCtrl.dispose();
    _coNameCtrl.dispose();
    _coAddressCtrl.dispose();
    _coPhoneCtrl.dispose();
    _coEmailCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) return;

      final userData = await Supabase.instance.client
          .from('users')
          .select()
          .eq('id', uid)
          .single();
      final user = AppUser.fromJson(userData);

      Company? company;
      if (user.companyId != null) {
        final coData = await Supabase.instance.client
            .from('companies')
            .select()
            .eq('id', user.companyId!)
            .single();
        company = Company.fromJson(coData);
      }

      setState(() {
        _user = user;
        _nameCtrl.text = user.fullName ?? '';
        _phoneCtrl.text = user.phone ?? '';
        _specialtyCtrl.text = user.specialty ?? '';
        _dailyRateCtrl.text = user.dailyRate != null ? '${user.dailyRate}' : '';

        _company = company;
        if (company != null) {
          _coNameCtrl.text = company.name;
          _coAddressCtrl.text = company.address ?? '';
          _coPhoneCtrl.text = company.phone ?? '';
          _coEmailCtrl.text = company.email ?? '';
          _currency = company.currency;
        }

        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) return;
      final rate = double.tryParse(_dailyRateCtrl.text.trim());
      await Supabase.instance.client.from('users').update({
        'full_name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        'specialty': _specialtyCtrl.text.trim().isEmpty ? null : _specialtyCtrl.text.trim(),
        'daily_rate': rate,
      }).eq('id', uid);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Profil mis à jour')));
      }
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _savePassword() async {
    final newPw = _newPwCtrl.text;
    final confirmPw = _confirmPwCtrl.text;
    if (newPw.length < 6) {
      _showError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPw != confirmPw) {
      _showError('Les mots de passe ne correspondent pas');
      return;
    }
    setState(() => _savingPw = true);
    try {
      await Supabase.instance.client.auth.updateUser(UserAttributes(password: newPw));
      _newPwCtrl.clear();
      _confirmPwCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Mot de passe mis à jour')));
      }
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) setState(() => _savingPw = false);
    }
  }

  Future<void> _saveCompany() async {
    if (_company == null) return;
    setState(() => _savingCompany = true);
    try {
      await Supabase.instance.client.from('companies').update({
        'name': _coNameCtrl.text.trim(),
        'address': _coAddressCtrl.text.trim().isEmpty ? null : _coAddressCtrl.text.trim(),
        'phone': _coPhoneCtrl.text.trim().isEmpty ? null : _coPhoneCtrl.text.trim(),
        'email': _coEmailCtrl.text.trim().isEmpty ? null : _coEmailCtrl.text.trim(),
        'currency': _currency,
      }).eq('id', _company!.id);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Entreprise mise à jour')));
      }
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) setState(() => _savingCompany = false);
    }
  }

  Future<void> _uploadAsset(String type) async {
    if (_company == null) return;
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (picked == null) return;

    setState(() {
      if (type == 'header') _uploadingHeader = true;
      if (type == 'footer') _uploadingFooter = true;
    });

    try {
      final file = File(picked.path);
      final ext = picked.path.split('.').last.toLowerCase();
      final path = '${_company!.id}/$type.$ext';

      await Supabase.instance.client.storage
          .from('company-assets')
          .upload(path, file, fileOptions: const FileOptions(upsert: true));

      final url = Supabase.instance.client.storage
          .from('company-assets')
          .getPublicUrl(path);

      final column = type == 'header' ? 'header_url' : 'footer_url';
      await Supabase.instance.client
          .from('companies')
          .update({column: url})
          .eq('id', _company!.id);

      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${type == 'header' ? 'En-tête' : 'Pied de page'} mis à jour')),
        );
      }
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) {
        setState(() {
          _uploadingHeader = false;
          _uploadingFooter = false;
        });
      }
    }
  }

  Future<void> _removeAsset(String type) async {
    if (_company == null) return;
    final column = type == 'header' ? 'header_url' : 'footer_url';
    try {
      await Supabase.instance.client
          .from('companies')
          .update({column: null})
          .eq('id', _company!.id);
      await _load();
    } catch (e) {
      _showError(e);
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Annuler')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Déconnecter',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirmed == true) {
      await Supabase.instance.client.auth.signOut();
    }
  }

  void _showError(Object e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Avatar header ─────────────────────────────────
                Center(
                  child: CircleAvatar(
                    radius: 36,
                    backgroundColor: cs.primaryContainer,
                    child: Text(
                      _user?.initials ?? '?',
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: cs.onPrimaryContainer),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    Supabase.instance.client.auth.currentUser?.email ?? '',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ),
                const SizedBox(height: 28),

                // ── Section: Profil ───────────────────────────────
                _SectionHeader(title: 'Mon profil'),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Nom complet',
                      prefixIcon: Icon(Icons.person_outlined)),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                      labelText: 'Téléphone',
                      prefixIcon: Icon(Icons.phone_outlined)),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _specialtyCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Spécialité',
                      prefixIcon: Icon(Icons.work_outlined)),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _dailyRateCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                      labelText: 'Taux journalier',
                      prefixIcon: Icon(Icons.payments_outlined),
                      hintText: 'ex: 15000'),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _savingProfile ? null : _saveProfile,
                    child: _savingProfile
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Enregistrer le profil'),
                  ),
                ),
                const SizedBox(height: 28),

                // ── Section: Mot de passe ─────────────────────────
                _SectionHeader(title: 'Mot de passe'),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _newPwCtrl,
                  obscureText: _obscureNew,
                  decoration: InputDecoration(
                    labelText: 'Nouveau mot de passe',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureNew
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () =>
                          setState(() => _obscureNew = !_obscureNew),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _confirmPwCtrl,
                  obscureText: _obscureConfirm,
                  decoration: InputDecoration(
                    labelText: 'Confirmer le mot de passe',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscureConfirm
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () =>
                          setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _savingPw ? null : _savePassword,
                    child: _savingPw
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Changer le mot de passe'),
                  ),
                ),

                if (_company != null) ...[
                  const SizedBox(height: 28),

                  // ── Section: Entreprise ─────────────────────────
                  _SectionHeader(title: 'Entreprise'),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _coNameCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Nom de l\'entreprise *',
                        prefixIcon: Icon(Icons.business_outlined)),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _coPhoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                        labelText: 'Téléphone',
                        prefixIcon: Icon(Icons.phone_outlined),
                        hintText: '+225 07 00 00 00 00'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _coEmailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                        labelText: 'Email professionnel',
                        prefixIcon: Icon(Icons.email_outlined)),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _coAddressCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                        labelText: 'Adresse',
                        prefixIcon: Icon(Icons.location_on_outlined)),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _currency,
                    decoration: const InputDecoration(
                        labelText: 'Devise',
                        prefixIcon: Icon(Icons.currency_exchange_outlined)),
                    items: _kCurrencies
                        .map((c) =>
                            DropdownMenuItem(value: c.$1, child: Text(c.$2)))
                        .toList(),
                    onChanged: (v) => setState(() => _currency = v!),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _savingCompany ? null : _saveCompany,
                      child: _savingCompany
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Enregistrer l\'entreprise'),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // ── Section: Assets PDF ─────────────────────────
                  _SectionHeader(title: 'Assets PDF'),
                  const SizedBox(height: 4),
                  Text(
                    'Images utilisées dans l\'en-tête et le pied de page des devis et factures.',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  const SizedBox(height: 16),
                  _AssetTile(
                    label: 'En-tête (header)',
                    icon: Icons.vertical_align_top_outlined,
                    url: _company!.headerUrl,
                    uploading: _uploadingHeader,
                    onUpload: () => _uploadAsset('header'),
                    onRemove: () => _removeAsset('header'),
                  ),
                  const SizedBox(height: 12),
                  _AssetTile(
                    label: 'Pied de page (footer)',
                    icon: Icons.vertical_align_bottom_outlined,
                    url: _company!.footerUrl,
                    uploading: _uploadingFooter,
                    onUpload: () => _uploadAsset('footer'),
                    onRemove: () => _removeAsset('footer'),
                  ),
                ],

                const SizedBox(height: 32),
                const Divider(),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Déconnexion',
                      style: TextStyle(color: Colors.red)),
                  onTap: _signOut,
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context)
          .textTheme
          .titleSmall
          ?.copyWith(fontWeight: FontWeight.w700),
    );
  }
}

class _AssetTile extends StatelessWidget {
  final String label;
  final IconData icon;
  final String? url;
  final bool uploading;
  final VoidCallback onUpload;
  final VoidCallback onRemove;

  const _AssetTile({
    required this.label,
    required this.icon,
    required this.url,
    required this.uploading,
    required this.onUpload,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(8),
                image: url != null
                    ? DecorationImage(
                        image: NetworkImage(url!), fit: BoxFit.cover)
                    : null,
              ),
              child: url == null
                  ? Icon(icon, color: cs.onSurfaceVariant, size: 24)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontWeight: FontWeight.w500, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(
                    url != null ? 'Image définie' : 'Aucune image',
                    style: TextStyle(
                        fontSize: 12, color: cs.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            if (uploading)
              const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2))
            else ...[
              IconButton(
                icon: const Icon(Icons.upload_outlined),
                tooltip: 'Choisir une image',
                onPressed: onUpload,
              ),
              if (url != null)
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  tooltip: 'Supprimer',
                  onPressed: onRemove,
                ),
            ],
          ],
        ),
      ),
    );
  }
}
