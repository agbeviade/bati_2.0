import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/models.dart' as models;
import '../../../shared/widgets/status_badge.dart';

class StockPage extends StatefulWidget {
  const StockPage({super.key});

  @override
  State<StockPage> createState() => _StockPageState();
}

class _StockPageState extends State<StockPage> {
  bool _loading = true;
  List<_ProjectStock> _projectStocks = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final uid = client.auth.currentUser?.id;
      if (uid == null) return;

      final userData = await client.from('users').select('company_id').eq('id', uid).single();
      final companyId = userData['company_id'] as String?;
      if (companyId == null) return;

      final projectsData = await client
          .from('projects')
          .select('id, name, status')
          .eq('company_id', companyId)
          .order('name');

      final projects = (projectsData as List).cast<Map<String, dynamic>>();
      final projectIds = projects.map((p) => p['id'] as String).toList();

      if (projectIds.isEmpty) {
        setState(() { _projectStocks = []; _loading = false; });
        return;
      }

      final movementsData = await client
          .from('stock_movements')
          .select('project_id, material_id, type, quantity, materials(name, unit)')
          .inFilter('project_id', projectIds)
          .inFilter('type', ['purchase', 'use', 'return']);

      final movements = (movementsData as List).cast<Map<String, dynamic>>();

      // Agréger par projet → matériau
      final byProject = <String, Map<String, Map<String, dynamic>>>{};
      for (final m in movements) {
        final projectId = m['project_id'] as String;
        final materialId = m['material_id'] as String;
        final mat = m['materials'] as Map<String, dynamic>?;
        final type = m['type'] as String;
        final qty = (m['quantity'] as num).toDouble();

        byProject.putIfAbsent(projectId, () => {});
        byProject[projectId]!.putIfAbsent(materialId, () => {
          'name': mat?['name'] ?? 'Matériau inconnu',
          'unit': mat?['unit'] ?? 'u',
          'entries': 0.0,
          'exits': 0.0,
          'qty': 0.0,
        });

        if (type == 'purchase' || type == 'return') {
          byProject[projectId]![materialId]!['entries'] =
              (byProject[projectId]![materialId]!['entries'] as double) + qty;
          byProject[projectId]![materialId]!['qty'] =
              (byProject[projectId]![materialId]!['qty'] as double) + qty;
        } else if (type == 'use') {
          byProject[projectId]![materialId]!['exits'] =
              (byProject[projectId]![materialId]!['exits'] as double) + qty;
          byProject[projectId]![materialId]!['qty'] =
              (byProject[projectId]![materialId]!['qty'] as double) - qty;
        }
      }

      final stockList = <_ProjectStock>[];
      for (final p in projects) {
        final pid = p['id'] as String;
        if (!byProject.containsKey(pid)) continue;
        final items = byProject[pid]!.entries
            .map((e) => _StockItem(
                  materialId: e.key,
                  name: e.value['name'] as String,
                  unit: e.value['unit'] as String,
                  entries: e.value['entries'] as double,
                  exits: e.value['exits'] as double,
                  qty: e.value['qty'] as double,
                ))
            .toList()
          ..sort((a, b) => a.qty.compareTo(b.qty));

        stockList.add(_ProjectStock(
          projectId: pid,
          projectName: p['name'] as String,
          status: models.projectStatusFromString(p['status'] as String? ?? 'planned'),
          items: items,
        ));
      }

      setState(() { _projectStocks = stockList; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final totalLow = _projectStocks.fold(
        0, (s, p) => s + p.items.where((i) => i.qty > 0 && i.qty < 10).length);
    final totalOut =
        _projectStocks.fold(0, (s, p) => s + p.items.where((i) => i.qty <= 0).length);

    return Scaffold(
      appBar: AppBar(title: const Text('Stock par chantier')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _projectStocks.isEmpty
                  ? ListView(children: [
                      SizedBox(
                        height: 400,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.warehouse_outlined,
                                  size: 48, color: cs.onSurfaceVariant.withValues(alpha: 0.4)),
                              const SizedBox(height: 12),
                              Text('Aucun stock enregistré',
                                  style: TextStyle(color: cs.onSurfaceVariant, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 4),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32),
                                child: Text(
                                  'Les mouvements de matériaux sur chaque chantier apparaîtront ici.',
                                  style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ])
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // KPIs
                        Row(
                          children: [
                            _KpiTile(
                                label: 'Chantiers',
                                value: '${_projectStocks.length}',
                                color: AppColors.primary),
                            const SizedBox(width: 8),
                            _KpiTile(
                                label: 'Stock faible',
                                value: '$totalLow',
                                color: totalLow > 0
                                    ? const Color(0xFFF59E0B)
                                    : cs.onSurfaceVariant),
                            const SizedBox(width: 8),
                            _KpiTile(
                                label: 'Épuisé',
                                value: '$totalOut',
                                color: totalOut > 0 ? AppColors.red : cs.onSurfaceVariant),
                          ],
                        ),
                        const SizedBox(height: 16),
                        ..._projectStocks
                            .map((ps) => _ProjectStockCard(ps: ps, currency: '')),
                      ],
                    ),
            ),
    );
  }
}

// ── Data classes ──────────────────────────────────────────────

class _ProjectStock {
  final String projectId;
  final String projectName;
  final models.ProjectStatus status;
  final List<_StockItem> items;
  _ProjectStock({
    required this.projectId,
    required this.projectName,
    required this.status,
    required this.items,
  });
}

class _StockItem {
  final String materialId;
  final String name;
  final String unit;
  final double entries;
  final double exits;
  final double qty;
  _StockItem({
    required this.materialId,
    required this.name,
    required this.unit,
    required this.entries,
    required this.exits,
    required this.qty,
  });
}

// ── Widgets ───────────────────────────────────────────────────

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _KpiTile({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.15)),
        ),
        child: Column(children: [
          Text(value,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.8)),
              textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}

class _ProjectStockCard extends StatelessWidget {
  final _ProjectStock ps;
  final String currency;
  const _ProjectStockCard({required this.ps, required this.currency});

  String _fmt(double v) => v % 1 == 0 ? v.toInt().toString() : v.toStringAsFixed(1);

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(ps.projectName,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(width: 8),
                ProjectStatusBadge(status: ps.status),
                const SizedBox(width: 6),
                Text('${ps.items.length} mat.',
                    style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
              ],
            ),
          ),
          const Divider(height: 1),
          ...ps.items.asMap().entries.map((entry) {
            final item = entry.value;
            final i = entry.key;
            final isOut = item.qty <= 0;
            final isLow = item.qty > 0 && item.qty < 10;
            final color = isOut
                ? AppColors.red
                : isLow
                    ? const Color(0xFFF59E0B)
                    : AppColors.green;
            return Column(children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(children: [
                  Container(
                    width: 6,
                    height: 36,
                    decoration: BoxDecoration(
                        color: color, borderRadius: BorderRadius.circular(3)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.name,
                              style: const TextStyle(
                                  fontSize: 13, fontWeight: FontWeight.w500),
                              overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 2),
                          Row(children: [
                            Icon(Icons.arrow_downward, size: 12, color: AppColors.green),
                            Text(' ${_fmt(item.entries)}',
                                style: TextStyle(
                                    fontSize: 11, color: cs.onSurfaceVariant)),
                            const SizedBox(width: 8),
                            Icon(Icons.arrow_upward, size: 12, color: AppColors.red),
                            Text(' ${_fmt(item.exits)}',
                                style: TextStyle(
                                    fontSize: 11, color: cs.onSurfaceVariant)),
                          ]),
                        ]),
                  ),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text('${_fmt(item.qty)} ${item.unit}',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: color)),
                    if (isOut)
                      Text('Épuisé',
                          style: TextStyle(fontSize: 10, color: AppColors.red)),
                    if (isLow)
                      Text('Faible',
                          style: const TextStyle(
                              fontSize: 10, color: Color(0xFFF59E0B))),
                  ]),
                ]),
              ),
              if (i < ps.items.length - 1) const Divider(height: 1),
            ]);
          }),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}
