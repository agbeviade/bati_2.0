import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/json_cache.dart';
import '../../../core/theme/app_theme.dart';
import 'ouvrage_form_page.dart';

const _kTypeIcons = <String, IconData>{
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

const _kTypeLabels = <String, String>{
  'surface_l_h': 'Surface',
  'volume_l_l_h': 'Volume',
  'cylindre': 'Cylindre',
  'toiture_pente': 'Toiture pente',
  'toiture_croupe': 'Toiture croupe',
  'lineaire': 'Linéaire',
  'unite': 'Unité',
  'escalier': 'Escalier',
  'trapeze': 'Trapèze',
};

const _kTypeColors = <String, Color>{
  'surface_l_h': AppColors.primary,
  'volume_l_l_h': AppColors.cyan,
  'cylindre': AppColors.violet,
  'toiture_pente': AppColors.orange,
  'toiture_croupe': AppColors.orangeDark,
  'lineaire': AppColors.green,
  'unite': AppColors.amber,
  'escalier': AppColors.red,
  'trapeze': AppColors.greenDark,
};

class MetresPage extends StatefulWidget {
  const MetresPage({super.key});

  @override
  State<MetresPage> createState() => _MetresPageState();
}

class _MetresPageState extends State<MetresPage> {
  static const _cacheKey = 'metres_v1';

  bool _loading = true;
  List<Map<String, dynamic>> _ouvrages = [];
  bool _generating = false;

  @override
  void initState() {
    super.initState();
    _hydrateFromCache();
    _refresh();
  }

  void _hydrateFromCache() {
    final entry = JsonCache.instance.read(_cacheKey);
    if (entry == null) return;
    try {
      final list = (entry.data as List).cast<Map<String, dynamic>>();
      setState(() {
        _ouvrages = list;
        _loading = false;
      });
    } catch (_) {}
  }

  Future<void> _refresh() async {
    try {
      final data = await Supabase.instance.client
          .from('project_ouvrages')
          .select('id, designation, type_geometrie, quantite_nette, unite_principale, project_id, projects(name)')
          .order('created_at', ascending: false)
          .limit(100);
      final jsonList = List<Map<String, dynamic>>.from(data as List);
      await JsonCache.instance.write(_cacheKey, jsonList);
      if (!mounted) return;
      setState(() {
        _ouvrages = jsonList;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer l\'ouvrage ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
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
      await Supabase.instance.client.from('project_ouvrages').delete().eq('id', id);
      _refresh();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red));
      }
    }
  }

  Future<void> _generateDevis(String projectId, List<Map<String, dynamic>> ouvrages) async {
    setState(() => _generating = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final profile = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final companyId = profile['company_id'] as String;

      final countResult = await Supabase.instance.client
          .from('quotes')
          .select('id')
          .eq('company_id', companyId)
          .count();
      final count = countResult.count;
      final year = DateTime.now().year;
      final quoteNumber = 'DEVIS-$year-${(count + 1).toString().padLeft(3, '0')}';

      final inserted = await Supabase.instance.client
          .from('quotes')
          .insert({
            'company_id': companyId,
            'quote_number': quoteNumber,
            'project_id': projectId,
            'project_type': 'Travaux BTP',
            'subtotal': 0,
            'tax_rate': 0,
            'tax_amount': 0,
            'margin_pct': 0,
            'total': 0,
            'status': 'draft',
            'notes': 'Généré depuis les métrés — compléter les prix unitaires',
            'created_by': uid,
          })
          .select('id')
          .single();

      final quoteId = inserted['id'] as String;

      // Créer une ligne par ouvrage
      final items = ouvrages.asMap().entries.map((entry) {
        final i = entry.key;
        final o = entry.value;
        final qty = (o['quantite_nette'] as num?)?.toDouble() ?? 0;
        final unite = o['unite_principale'] as String? ?? 'u';
        return {
          'quote_id': quoteId,
          'category': 'other',
          'label': o['designation'] as String? ?? 'Ouvrage',
          'quantity': qty,
          'unit': unite,
          'unit_price': 0,
          'sort_order': i,
        };
      }).toList();

      if (items.isNotEmpty) {
        await Supabase.instance.client.from('quote_items').insert(items);
      }

      if (mounted) {
        context.push('/quotes/$quoteId');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppColors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _showGenerateSheet() async {
    // Group ouvrages by project
    final byProject = <String, List<Map<String, dynamic>>>{};
    for (final o in _ouvrages) {
      final pid = o['project_id'] as String? ?? '';
      byProject.putIfAbsent(pid, () => []).add(o);
    }

    if (!mounted) return;

    if (byProject.length == 1) {
      final projectId = byProject.keys.first;
      final ouvrages = byProject[projectId]!;
      await _generateDevis(projectId, ouvrages);
      return;
    }

    // Multiple projects — let user pick
    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          const Text('Choisir le chantier',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 8),
          ...byProject.entries.map((entry) {
            final projectName = entry.value.first['projects'] != null
                ? (entry.value.first['projects'] as Map)['name'] as String? ?? 'Chantier'
                : 'Chantier';
            return ListTile(
              title: Text(projectName),
              subtitle: Text('${entry.value.length} ouvrage${entry.value.length > 1 ? 's' : ''}'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14),
              onTap: () => Navigator.pop(ctx, entry.key),
            );
          }),
          const SizedBox(height: 16),
        ],
      ),
    );

    if (selected != null && mounted) {
      await _generateDevis(selected, byProject[selected]!);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 130,
              pinned: true,
              backgroundColor: AppColors.primaryDark,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(gradient: AppColors.gradientHero),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.square_foot, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'Métrés',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _loading
                                ? 'Chargement...'
                                : '${_ouvrages.length} ouvrage${_ouvrages.length != 1 ? 's' : ''}',
                            style:
                                TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                title: const Text(
                  'Métrés',
                  style:
                      TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 17),
                ),
                titlePadding: const EdgeInsets.only(left: 20, bottom: 14),
              ),
              actions: [
                if (!_loading && _ouvrages.isNotEmpty)
                  _generating
                      ? const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                        )
                      : IconButton(
                          icon: const Icon(Icons.description_outlined, color: Colors.white),
                          tooltip: 'Générer un devis',
                          onPressed: _showGenerateSheet,
                        ),
              ],
            ),
            if (_loading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (_ouvrages.isEmpty)
              const SliverFillRemaining(child: _EmptyMetres())
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, i) => _OuvrageCard(
                      ouvrage: _ouvrages[i],
                      onEdit: () async {
                        // Load full ouvrage data for edit
                        final data = await Supabase.instance.client
                            .from('project_ouvrages')
                            .select()
                            .eq('id', _ouvrages[i]['id'] as String)
                            .single();
                        if (!context.mounted) return;
                        final result = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(
                            builder: (_) => OuvrageFormPage(ouvrage: data),
                          ),
                        );
                        if (result == true) _refresh();
                      },
                      onDelete: () => _delete(_ouvrages[i]['id'] as String),
                    ),
                    childCount: _ouvrages.length,
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Nouvel ouvrage'),
        onPressed: () async {
          final result = await context.push('/metres/new');
          if (result == true) _refresh();
        },
      ),
    );
  }
}

class _OuvrageCard extends StatelessWidget {
  final Map<String, dynamic> ouvrage;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _OuvrageCard({required this.ouvrage, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final type = ouvrage['type_geometrie'] as String? ?? '';
    final color = _kTypeColors[type] ?? AppColors.primary;
    final icon = _kTypeIcons[type] ?? Icons.construction_outlined;
    final typeLabel = _kTypeLabels[type] ?? type;
    final quantite = (ouvrage['quantite_nette'] as num?)?.toDouble() ?? 0;
    final unite = ouvrage['unite_principale'] as String? ?? '';
    final project = ouvrage['projects'] as Map<String, dynamic>?;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [color.withValues(alpha: 0.75), color],
                  ),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ouvrage['designation'] as String? ?? '',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.textPrimary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        _TypeChip(label: typeLabel, color: color),
                        if (project != null) ...[
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              project['name'] as String? ?? '',
                              style: const TextStyle(
                                  fontSize: 11, color: AppColors.textSecondary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    quantite == quantite.truncateToDouble()
                        ? quantite.toStringAsFixed(0)
                        : quantite.toStringAsFixed(2),
                    style: TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 17, color: color),
                  ),
                  Text(
                    unite,
                    style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              PopupMenuButton<String>(
                icon: Icon(Icons.more_vert, color: AppColors.textSecondary, size: 18),
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'delete') onDelete();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: ListTile(
                      leading: Icon(Icons.edit_outlined),
                      title: Text('Modifier'),
                      dense: true,
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: ListTile(
                      leading: Icon(Icons.delete_outline, color: Colors.red),
                      title: Text('Supprimer', style: TextStyle(color: Colors.red)),
                      dense: true,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final Color color;
  const _TypeChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

class _EmptyMetres extends StatelessWidget {
  const _EmptyMetres();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: AppColors.gradientHero,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.square_foot, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 20),
            const Text('Aucun métré',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 8),
            const Text(
              'Créez votre premier ouvrage\npour calculer les quantités automatiquement.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
