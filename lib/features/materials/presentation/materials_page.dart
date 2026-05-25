import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart' as models;
import '../../../shared/widgets/empty_state.dart';

class MaterialsPage extends StatefulWidget {
  const MaterialsPage({super.key});

  @override
  State<MaterialsPage> createState() => _MaterialsPageState();
}

class _MaterialsPageState extends State<MaterialsPage> {
  bool _loading = true;
  List<models.Material> _materials = [];
  Map<String, String> _categoryLabels = {};
  String _search = '';
  String _selectedCategory = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait([
        client.from('materials').select('id, name, category, unit, stock_qty, unit_cost').order('name'),
        client.from('material_categories').select('slug, label').order('label'),
      ]);

      final labels = <String, String>{};
      for (final c in (results[1] as List)) {
        labels[c['slug'] as String] = c['label'] as String;
      }

      setState(() {
        _materials = (results[0] as List).map((j) => models.Material.fromJson(j)).toList();
        _categoryLabels = labels;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<models.Material> get _filtered {
    return _materials.where((m) {
      final matchSearch = _search.isEmpty || m.name.toLowerCase().contains(_search.toLowerCase());
      final matchCat = _selectedCategory.isEmpty || m.category == _selectedCategory;
      return matchSearch && matchCat;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filtered = _filtered;

    final categories = _categoryLabels.entries.toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Matériaux & Stock')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final done = await context.push('/materials/movement');
          if (done == true) _load();
        },
        icon: const Icon(Icons.add_shopping_cart_outlined),
        label: const Text('Achat / Ajustement'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Info banner: exits are managed from projects
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, size: 15, color: Color(0xFF2563EB)),
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
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Rechercher...',
                      prefixIcon: Icon(Icons.search),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                if (categories.isNotEmpty)
                  SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
                      children: [
                        _FilterChip(
                          label: 'Tous',
                          selected: _selectedCategory.isEmpty,
                          onTap: () => setState(() => _selectedCategory = ''),
                        ),
                        ...categories.map((e) => _FilterChip(
                              label: e.value,
                              selected: _selectedCategory == e.key,
                              onTap: () => setState(() => _selectedCategory = e.key),
                            )),
                      ],
                    ),
                  ),
                const SizedBox(height: 4),
                Expanded(
                  child: filtered.isEmpty
                      ? (_materials.isEmpty
                          ? const EmptyState(
                              icon: Icons.inventory_2_outlined,
                              title: 'Aucun matériau',
                              subtitle: 'Ajoutez des matériaux depuis la version web',
                            )
                          : Center(
                              child: Text('Aucun résultat',
                                  style: TextStyle(color: cs.onSurfaceVariant)),
                            ))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: filtered.length,
                            itemBuilder: (_, i) => _MaterialTile(
                              material: filtered[i],
                              categoryLabel: _categoryLabels[filtered[i].category] ?? filtered[i].category,
                            ),
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? cs.primary : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: selected ? cs.onPrimary : cs.onSurfaceVariant,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _MaterialTile extends StatelessWidget {
  final models.Material material;
  final String categoryLabel;
  const _MaterialTile({required this.material, required this.categoryLabel});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final m = material;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final done = await context.push(
            '/materials/movement',
            extra: {'materialId': m.id, 'materialName': m.name},
          );
          if (done == true && context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Stock mis à jour')),
            );
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: cs.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.inventory_2_outlined, color: cs.onPrimaryContainer, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m.name,
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    Text(categoryLabel,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: cs.onSurfaceVariant)),
                  ],
                ),
              ),
              Text(
                '${m.stockQty.toStringAsFixed(m.stockQty % 1 == 0 ? 0 : 1)} ${m.unit}',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
