import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';

// ── Constantes géométrie ────────────────────────────────────────────────────

const _kTypes = [
  'surface_l_h',
  'volume_l_l_h',
  'cylindre',
  'toiture_pente',
  'toiture_croupe',
  'lineaire',
  'unite',
  'escalier',
  'trapeze',
];

const _kTypeLabels = {
  'surface_l_h': 'Surface',
  'volume_l_l_h': 'Volume',
  'cylindre': 'Cylindre',
  'toiture_pente': 'Toiture 2 pans',
  'toiture_croupe': 'Toiture 4 pans',
  'lineaire': 'Linéaire',
  'unite': 'Unité',
  'escalier': 'Escalier',
  'trapeze': 'Trapèze',
};

const _kTypeIcons = {
  'surface_l_h': Icons.crop_landscape_outlined,
  'volume_l_l_h': Icons.view_in_ar_outlined,
  'cylindre': Icons.radio_button_unchecked,
  'toiture_pente': Icons.roofing_outlined,
  'toiture_croupe': Icons.home_outlined,
  'lineaire': Icons.horizontal_rule,
  'unite': Icons.tag,
  'escalier': Icons.stairs_outlined,
  'trapeze': Icons.change_history_outlined,
};

// champs de saisie par type
const _kChamps = <String, List<Map<String, String>>>{
  'surface_l_h': [
    {'key': 'longueur', 'label': 'Longueur (m)', 'hint': 'ex: 10'},
    {'key': 'hauteur', 'label': 'Hauteur / Largeur (m)', 'hint': 'ex: 3'},
  ],
  'volume_l_l_h': [
    {'key': 'longueur', 'label': 'Longueur (m)', 'hint': 'ex: 5'},
    {'key': 'largeur', 'label': 'Largeur (m)', 'hint': 'ex: 4'},
    {'key': 'hauteur', 'label': 'Épaisseur / Profondeur (m)', 'hint': 'ex: 0.15'},
  ],
  'cylindre': [
    {'key': 'diametre', 'label': 'Diamètre (m)', 'hint': 'ex: 0.30'},
    {'key': 'hauteur', 'label': 'Hauteur (m)', 'hint': 'ex: 3'},
  ],
  'toiture_pente': [
    {'key': 'surface_sol', 'label': 'Surface au sol (m²)', 'hint': 'ex: 80'},
    {'key': 'pente', 'label': 'Pente (%)', 'hint': 'ex: 35'},
  ],
  'toiture_croupe': [
    {'key': 'surface_sol', 'label': 'Surface au sol (m²)', 'hint': 'ex: 80'},
    {'key': 'pente', 'label': 'Pente (%)', 'hint': 'ex: 35'},
  ],
  'lineaire': [
    {'key': 'longueur', 'label': 'Longueur (m)', 'hint': 'ex: 25'},
  ],
  'unite': [
    {'key': 'longueur', 'label': 'Quantité', 'hint': 'ex: 3'},
  ],
  'escalier': [
    {'key': 'nb_marches', 'label': 'Nombre de marches', 'hint': 'ex: 14'},
    {'key': 'giron', 'label': 'Giron (m)', 'hint': '0.28'},
    {'key': 'contremarche', 'label': 'Contremarche (m)', 'hint': '0.17'},
    {'key': 'largeur', 'label': 'Largeur escalier (m)', 'hint': 'ex: 1.20'},
  ],
  'trapeze': [
    {'key': 'a', 'label': 'Grande base a (m)', 'hint': 'ex: 8'},
    {'key': 'b', 'label': 'Petite base b (m)', 'hint': 'ex: 5'},
    {'key': 'hauteur', 'label': 'Hauteur (m)', 'hint': 'ex: 4'},
  ],
};

// ── Moteur de calcul ────────────────────────────────────────────────────────

double _calculerBrut(String type, Map<String, double> d) {
  final l = d['longueur'] ?? 0;
  final la = d['largeur'] ?? 0;
  final h = d['hauteur'] ?? 0;
  final diam = d['diametre'] ?? 0;
  final pente = d['pente'] ?? 0;
  final sol = d['surface_sol'] ?? 0;

  switch (type) {
    case 'surface_l_h':
      return l * h;
    case 'volume_l_l_h':
      return l * la * h;
    case 'cylindre':
      final r = diam / 2;
      return r == 0 ? 0 : pi * r * r * h;
    case 'toiture_pente':
      if (sol == 0) return 0;
      if (pente == 0) return sol;
      return sol / cos(atan(pente / 100));
    case 'toiture_croupe':
      if (sol == 0) return 0;
      final facteur = pente == 0 ? 1.0 : 1.0 / cos(atan(pente / 100));
      return sol * facteur * 1.05;
    case 'lineaire':
      return l;
    case 'unite':
      return l;
    case 'escalier':
      final nb = d['nb_marches'] ?? 0;
      final giron = d['giron'] != null && d['giron']! > 0 ? d['giron']! : 0.28;
      final contre = d['contremarche'] != null && d['contremarche']! > 0 ? d['contremarche']! : 0.17;
      return nb * (giron + contre) * la;
    case 'trapeze':
      final a = d['a'] ?? l;
      final b = d['b'] ?? la;
      return h == 0 ? 0 : ((a + b) / 2) * h;
    default:
      return 0;
  }
}

bool _estVolume(String type) => type == 'volume_l_l_h' || type == 'cylindre';

String _getUnite(String type) {
  if (_estVolume(type)) return 'm³';
  if (type == 'lineaire') return 'ml';
  if (type == 'unite') return 'u';
  return 'm²';
}

// ── Local model pour les vides ───────────────────────────────────────────────

class _Vide {
  final TextEditingController nom;
  final TextEditingController largeur;
  final TextEditingController hauteur;

  _Vide()
      : nom = TextEditingController(),
        largeur = TextEditingController(),
        hauteur = TextEditingController();

  double get surface {
    final l = double.tryParse(largeur.text) ?? 0;
    final h = double.tryParse(hauteur.text) ?? 0;
    return l * h;
  }

  void dispose() {
    nom.dispose();
    largeur.dispose();
    hauteur.dispose();
  }

  Map<String, dynamic> toJson() => {
        'id': DateTime.now().microsecondsSinceEpoch.toString(),
        'nom': nom.text,
        'largeur': double.tryParse(largeur.text) ?? 0,
        'hauteur': double.tryParse(hauteur.text) ?? 0,
        'surface': surface,
      };
}

// ── Page principale ─────────────────────────────────────────────────────────

class OuvrageFormPage extends StatefulWidget {
  final Map<String, dynamic>? ouvrage;

  const OuvrageFormPage({super.key, this.ouvrage});

  @override
  State<OuvrageFormPage> createState() => _OuvrageFormPageState();
}

class _OuvrageFormPageState extends State<OuvrageFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _designationCtrl = TextEditingController();
  final Map<String, TextEditingController> _dimCtrl = {};

  String _geoType = 'surface_l_h';
  String? _projectId;
  final List<_Vide> _vides = [];
  List<Map<String, dynamic>> _projects = [];
  bool _saving = false;
  bool _loadingProjects = true;

  bool get _isEdit => widget.ouvrage != null;

  @override
  void initState() {
    super.initState();
    _loadProjects();
    if (_isEdit) {
      final o = widget.ouvrage!;
      _designationCtrl.text = o['designation'] as String? ?? '';
      _geoType = o['type_geometrie'] as String? ?? 'surface_l_h';
      _projectId = o['project_id'] as String?;
      final dims = (o['dimensions'] as Map<String, dynamic>?) ?? {};
      for (final entry in dims.entries) {
        _dimCtrl[entry.key] = TextEditingController(text: entry.value?.toString() ?? '');
      }
      final vides = (o['vides_deduits'] as List?) ?? [];
      for (final v in vides) {
        final vide = _Vide();
        vide.nom.text = v['nom'] as String? ?? '';
        vide.largeur.text = (v['largeur'] as num?)?.toString() ?? '';
        vide.hauteur.text = (v['hauteur'] as num?)?.toString() ?? '';
        _vides.add(vide);
      }
    }
    _ensureDimControllers();
  }

  void _ensureDimControllers() {
    final champs = _kChamps[_geoType] ?? [];
    for (final c in champs) {
      _dimCtrl.putIfAbsent(c['key']!, () => TextEditingController());
    }
  }

  @override
  void dispose() {
    _designationCtrl.dispose();
    for (final c in _dimCtrl.values) {
      c.dispose();
    }
    for (final v in _vides) {
      v.dispose();
    }
    super.dispose();
  }

  Future<void> _loadProjects() async {
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;
      final data = await Supabase.instance.client
          .from('projects')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');
      setState(() {
        _projects = (data as List).cast<Map<String, dynamic>>();
        _loadingProjects = false;
        if (_isEdit && _projectId == null && _projects.isNotEmpty) {
          // keep null
        }
      });
    } catch (_) {
      setState(() => _loadingProjects = false);
    }
  }

  Map<String, double> get _dims {
    final result = <String, double>{};
    for (final entry in _dimCtrl.entries) {
      final v = double.tryParse(entry.value.text);
      if (v != null) result[entry.key] = v;
    }
    return result;
  }

  double get _brut => _calculerBrut(_geoType, _dims);
  double get _totalVides => _estVolume(_geoType)
      ? 0
      : _vides.fold(0.0, (s, v) => s + v.surface);
  double get _nette => max(0, _brut - _totalVides);
  String get _unite => _getUnite(_geoType);

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_projectId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sélectionnez un chantier')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;

      final dims = <String, dynamic>{};
      for (final entry in _dimCtrl.entries) {
        final v = double.tryParse(entry.value.text);
        if (v != null) dims[entry.key] = v;
      }

      final videsJson = _vides.map((v) => v.toJson()).toList();

      final payload = {
        'company_id': companyId,
        'project_id': _projectId,
        'designation': _designationCtrl.text.trim(),
        'type_geometrie': _geoType,
        'dimensions': dims,
        'vides_deduits': videsJson,
        'quantite_brute': _brut,
        'quantite_nette': _nette,
        'unite_principale': _unite,
        'recette': [],
        'recette_calculee': [],
      };

      if (_isEdit) {
        await Supabase.instance.client
            .from('project_ouvrages')
            .update(payload)
            .eq('id', widget.ouvrage!['id'] as String);
      } else {
        await Supabase.instance.client.from('project_ouvrages').insert(payload);
      }

      if (mounted) context.pop(true);
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

  void _onTypeChanged(String type) {
    setState(() {
      _geoType = type;
      _vides.clear();
      _ensureDimControllers();
    });
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final champs = _kChamps[_geoType] ?? [];

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Modifier l\'ouvrage' : 'Nouvel ouvrage')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Désignation ────────────────────────────────────
            TextFormField(
              controller: _designationCtrl,
              decoration: const InputDecoration(
                labelText: 'Désignation *',
                prefixIcon: Icon(Icons.label_outline),
                hintText: 'ex: Mur pignon façade nord',
              ),
              textCapitalization: TextCapitalization.sentences,
              validator: (v) => v == null || v.trim().isEmpty ? 'Requis' : null,
            ),
            const SizedBox(height: 12),

            // ── Chantier ───────────────────────────────────────
            _loadingProjects
                ? const LinearProgressIndicator()
                : DropdownButtonFormField<String>(
                    initialValue: _projectId,
                    decoration: const InputDecoration(
                      labelText: 'Chantier *',
                      prefixIcon: Icon(Icons.construction_outlined),
                    ),
                    items: _projects
                        .map((p) => DropdownMenuItem<String>(
                              value: p['id'] as String,
                              child: Text(p['name'] as String),
                            ))
                        .toList(),
                    onChanged: (v) => setState(() => _projectId = v),
                    hint: const Text('Sélectionner un chantier'),
                  ),
            const SizedBox(height: 20),

            // ── Type de géométrie ──────────────────────────────
            Text('Type de géométrie',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            SizedBox(
              height: 80,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _kTypes.length,
                separatorBuilder: (_, i) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final t = _kTypes[i];
                  final selected = _geoType == t;
                  final color = selected ? AppColors.primary : cs.onSurfaceVariant;
                  return GestureDetector(
                    onTap: () => _onTypeChanged(t),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 80,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : cs.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected ? AppColors.primary : Colors.transparent,
                          width: 1.5,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(_kTypeIcons[t]!, color: color, size: 22),
                          const SizedBox(height: 4),
                          Text(
                            _kTypeLabels[t]!,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                              color: color,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),

            // ── Dimensions ─────────────────────────────────────
            Text('Dimensions',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            ...champs.map((c) {
              final key = c['key']!;
              _dimCtrl.putIfAbsent(key, () => TextEditingController());
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TextFormField(
                  controller: _dimCtrl[key],
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: c['label'],
                    hintText: c['hint'],
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
              );
            }),

            // ── Vides déduits (surfaces uniquement) ────────────
            if (!_estVolume(_geoType)) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Text('Vides déduits',
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600)),
                  const Spacer(),
                  TextButton.icon(
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Ajouter'),
                    onPressed: () => setState(() => _vides.add(_Vide())),
                  ),
                ],
              ),
              if (_vides.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Aucune baie, fenêtre ou ouverture à déduire',
                    style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                  ),
                )
              else
                ..._vides.asMap().entries.map((entry) {
                  final i = entry.key;
                  final v = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: v.nom,
                                  decoration: const InputDecoration(
                                    labelText: 'Nom (facultatif)',
                                    isDense: true,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, size: 18),
                                onPressed: () => setState(() {
                                  _vides[i].dispose();
                                  _vides.removeAt(i);
                                }),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: v.largeur,
                                  onChanged: (_) => setState(() {}),
                                  decoration:
                                      const InputDecoration(labelText: 'Largeur (m)', isDense: true),
                                  keyboardType:
                                      const TextInputType.numberWithOptions(decimal: true),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextFormField(
                                  controller: v.hauteur,
                                  onChanged: (_) => setState(() {}),
                                  decoration:
                                      const InputDecoration(labelText: 'Hauteur (m)', isDense: true),
                                  keyboardType:
                                      const TextInputType.numberWithOptions(decimal: true),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                '${v.surface.toStringAsFixed(2)} m²',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600, color: AppColors.red, fontSize: 12),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ],

            // ── Résultat live ──────────────────────────────────
            const SizedBox(height: 20),
            _ResultCard(
              brut: _brut,
              videsTotal: _totalVides,
              nette: _nette,
              unite: _unite,
              isVolume: _estVolume(_geoType),
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
                  : Text(_isEdit ? 'Enregistrer' : 'Créer l\'ouvrage'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => context.pop(),
              child: const Text('Annuler'),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ── Widget résultat ─────────────────────────────────────────────────────────

class _ResultCard extends StatelessWidget {
  final double brut;
  final double videsTotal;
  final double nette;
  final String unite;
  final bool isVolume;

  const _ResultCard({
    required this.brut,
    required this.videsTotal,
    required this.nette,
    required this.unite,
    required this.isVolume,
  });

  String _fmt(double v) {
    if (v == v.truncateToDouble()) return v.toStringAsFixed(0);
    return v.toStringAsFixed(3);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.gradientHero,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Quantité brute',
                  style: TextStyle(color: Colors.white70, fontSize: 13)),
              Text('${_fmt(brut)} $unite',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
          if (!isVolume && videsTotal > 0) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Vides déduits',
                    style: TextStyle(color: Colors.white70, fontSize: 13)),
                Text('− ${_fmt(videsTotal)} $unite',
                    style: const TextStyle(
                        color: Colors.white60, fontWeight: FontWeight.w500, fontSize: 13)),
              ],
            ),
          ],
          const Divider(color: Colors.white30, height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Quantité nette',
                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
              Text(
                '${_fmt(nette)} $unite',
                style: const TextStyle(
                    color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
