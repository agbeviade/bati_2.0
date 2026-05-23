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
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Supabase.instance.client
          .from('materials')
          .select()
          .order('name');
      setState(() {
        _materials = (data as List).map((j) => models.Material.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<models.Material> get _filtered {
    if (_search.isEmpty) return _materials;
    return _materials.where((m) => m.name.toLowerCase().contains(_search.toLowerCase())).toList();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final lowStock = _materials.where((m) => m.isLowStock).length;
    final filtered = _filtered;

    return Scaffold(
      appBar: AppBar(title: const Text('Matériaux & Stock')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final done = await context.push('/materials/movement');
          if (done == true) _load();
        },
        icon: const Icon(Icons.swap_vert),
        label: const Text('Mouvement'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (lowStock > 0)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8)),
                    child: Row(
                      children: [
                        const Icon(Icons.inventory_2, color: Color(0xFFEA580C), size: 18),
                        const SizedBox(width: 8),
                        Text('$lowStock matériau${lowStock > 1 ? 'x' : ''} en stock faible',
                            style: const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.w500, fontSize: 13)),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Rechercher...',
                      prefixIcon: Icon(Icons.search),
                      isDense: true,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? (_materials.isEmpty
                          ? const EmptyState(icon: Icons.inventory_2_outlined, title: 'Aucun matériau', subtitle: 'Ajoutez des matériaux depuis la version web')
                          : Center(child: Text('Aucun résultat', style: TextStyle(color: cs.onSurfaceVariant))))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: filtered.length,
                            itemBuilder: (_, i) => _MaterialTile(material: filtered[i]),
                          ),
                        ),
                ),
              ],
            ),
    );
  }
}

const _kCategoryLabels = {
  'installation':      'Installation de chantier',
  'terrassement':      'Terrassement',
  'gros_oeuvre':       'Gros œuvres / Béton',
  'etancheite':        'Étanchéité',
  'menuiserie_alu':    'Menuiserie aluminium',
  'vitrage':           'Vitrage',
  'serrurerie':        'Serrurerie',
  'plomberie':         'Plomberie sanitaire',
  'assainissement':    'Assainissement',
  'electricite':       'Électricité',
  'climatisation':     'Climatisation',
  'telephonie':        'Téléphonie',
  'revetement_dur':    'Revêtements durs',
  'revetement_souple': 'Revêtements souples',
  'menuiserie_bois':   'Menuiserie bois / PVC',
  'faux_plafond':      'Faux plafonds',
  'peinture':          'Peinture / Vernis',
  'charpente':         'Charpente / Couverture',
  // anciens slugs
  'cement': 'Ciment & Liants', 'steel': 'Acier / Fer à béton',
  'sand_gravel': 'Sable & Gravier', 'wood': 'Menuiserie Bois',
  'paint': 'Peintures & Enduits', 'electrical': 'Électricité',
  'plumbing': 'Plomberie & Sanitaire', 'other': 'Autre',
};

class _MaterialTile extends StatelessWidget {
  final models.Material material;
  const _MaterialTile({required this.material});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final m = material;
    final isLow = m.isLowStock;
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
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Stock mis à jour')));
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
                color: isLow ? const Color(0xFFFFF7ED) : cs.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.inventory_2_outlined,
                color: isLow ? const Color(0xFFEA580C) : cs.onPrimaryContainer,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(m.name, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  Text(_kCategoryLabels[m.category] ?? m.category, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${m.stockQty.toStringAsFixed(m.stockQty % 1 == 0 ? 0 : 1)} ${m.unit}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isLow ? const Color(0xFFEA580C) : cs.onSurface,
                      ),
                ),
                if (isLow)
                  const Text('Stock faible', style: TextStyle(fontSize: 11, color: Color(0xFFEA580C), fontWeight: FontWeight.w500)),
              ],
            ),
          ],
        ),
      ),
      ),
    );
  }
}
