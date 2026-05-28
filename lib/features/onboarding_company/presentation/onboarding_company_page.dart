import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';

/// Création de l'entreprise — affiché après le 1er login si l'utilisateur
/// n'a pas encore de `company_id` (cas après signup mobile).
///
/// Reproduit le flow web `app/(onboarding)/onboarding/`:
///   1. INSERT into companies (allowed by RLS `companies_insert_authenticated`)
///   2. UPDATE users SET company_id=…, role='admin' WHERE id=auth.uid()
///      (allowed by RLS `users_update_self`)
/// Pas besoin de service role grâce aux policies RLS.
class OnboardingCompanyPage extends StatefulWidget {
  const OnboardingCompanyPage({super.key});

  @override
  State<OnboardingCompanyPage> createState() => _OnboardingCompanyPageState();
}

class _OnboardingCompanyPageState extends State<OnboardingCompanyPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  String _currency = 'XOF';
  bool _loading = false;

  static const _currencies = [
    ('XOF', 'XOF — Franc CFA (UEMOA)'),
    ('XAF', 'XAF — Franc CFA (CEMAC)'),
    ('MAD', 'MAD — Dirham marocain'),
    ('EUR', 'EUR — Euro'),
    ('USD', 'USD — Dollar américain'),
    ('GHS', 'GHS — Cedi ghanéen'),
    ('NGN', 'NGN — Naira nigérian'),
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    final supabase = Supabase.instance.client;
    final user = supabase.auth.currentUser;
    if (user == null) {
      if (mounted) context.go('/login');
      return;
    }

    try {
      // 1. Créer la company
      final company = await supabase
          .from('companies')
          .insert({
            'name': _nameCtrl.text.trim(),
            'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
            'email': _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
            'address': _addressCtrl.text.trim().isEmpty ? null : _addressCtrl.text.trim(),
            'currency': _currency,
          })
          .select('id')
          .single();

      // 2. Lier le user et lui donner le rôle admin
      await supabase
          .from('users')
          .update({'company_id': company['id'], 'role': 'admin'})
          .eq('id', user.id);

      // Invalide le cache profile du router pour qu'il re-fetch company_id
      // (sinon le redirect renverrait sur cette même page).
      invalidateProfileCache();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Entreprise créée. Bienvenue !'),
            backgroundColor: AppColors.green,
          ),
        );
        context.go('/dashboard');
      }
    } on PostgrestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.red),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: cs.surface,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _loading ? null : _signOut,
            child: const Text('Déconnexion'),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 8),
                // ── En-tête ─────────────────────────────────────────
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.business_outlined,
                      color: AppColors.primary, size: 32),
                ),
                const SizedBox(height: 20),
                Text(
                  'Créez votre entreprise',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Ces informations apparaîtront sur vos devis et factures.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: cs.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 28),

                // ── Form ────────────────────────────────────────────
                TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(
                    labelText: "Nom de l'entreprise *",
                    hintText: 'BTP Kouassi & Fils',
                    prefixIcon: Icon(Icons.apartment_outlined),
                  ),
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || v.trim().length < 2) {
                      return 'Minimum 2 caractères';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Téléphone',
                    hintText: '+225 07 00 00 00 00',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email professionnel',
                    hintText: 'contact@entreprise.com',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  textInputAction: TextInputAction.next,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return null;
                    if (!v.contains('@')) return 'Email invalide';
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _addressCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Adresse',
                    hintText: 'Abidjan, Cocody',
                    prefixIcon: Icon(Icons.location_on_outlined),
                  ),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _currency,
                  decoration: const InputDecoration(
                    labelText: 'Devise',
                    prefixIcon: Icon(Icons.payments_outlined),
                  ),
                  items: _currencies
                      .map((c) => DropdownMenuItem(value: c.$1, child: Text(c.$2)))
                      .toList(),
                  onChanged: (v) => setState(() => _currency = v ?? 'XOF'),
                ),
                const SizedBox(height: 24),

                // ── CTA ─────────────────────────────────────────────
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Créer mon entreprise',
                                  style: TextStyle(
                                      fontSize: 15, fontWeight: FontWeight.w700)),
                              SizedBox(width: 8),
                              Icon(Icons.arrow_forward_rounded, size: 20),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Vous pourrez modifier ces informations dans les Paramètres.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: cs.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
