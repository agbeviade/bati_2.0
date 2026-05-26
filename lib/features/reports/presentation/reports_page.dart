import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  bool _loading = true;
  double _totalInvoiced = 0;
  double _totalCollected = 0;
  int _totalHours = 0;
  int _activeProjects = 0;
  List<_MonthRevenue> _monthlyRevenue = [];
  List<_TopItem> _topProjects = [];
  List<_TopItem> _topWorkers = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final client = Supabase.instance.client;
    try {
      final now = DateTime.now();
      final yearStart = DateTime(now.year, 1, 1).toIso8601String();

      final results = await Future.wait<dynamic>([
        client.from('invoices').select('amount, status, created_at').gte('created_at', yearStart),
        client.from('attendance').select('hours_worked, check_in').not('hours_worked', 'is', null).gte('check_in', yearStart),
        client.from('projects').select('id, name, spent').inFilter('status', ['in_progress', 'completed']).order('spent', ascending: false).limit(5),
        client.from('attendance').select('user_id, hours_worked, users(full_name)').not('hours_worked', 'is', null).gte('check_in', DateTime(now.year, now.month, 1).toIso8601String()),
        client.from('projects').select('id').eq('status', 'in_progress'),
      ]);

      // KPIs
      double invoiced = 0, collected = 0;
      final Map<int, double> byMonth = {};
      for (final inv in (results[0] as List)) {
        final amount = (inv['amount'] as num).toDouble();
        invoiced += amount;
        if (inv['status'] == 'paid') collected += amount;
        final month = DateTime.parse(inv['created_at'] as String).month;
        byMonth[month] = (byMonth[month] ?? 0) + amount;
      }

      int hours = 0;
      for (final att in (results[1] as List)) {
        hours += ((att['hours_worked'] as num).toDouble()).toInt();
      }

      // Monthly revenue (last 6 months)
      final List<_MonthRevenue> monthly = [];
      for (int i = 5; i >= 0; i--) {
        final month = now.month - i;
        final adjustedMonth = ((month - 1) % 12) + 1;
        monthly.add(_MonthRevenue(
          month: _monthLabel(adjustedMonth),
          amount: byMonth[adjustedMonth] ?? 0,
        ));
      }
      final maxRev = monthly.map((m) => m.amount).fold(0.0, (a, b) => a > b ? a : b);
      for (final m in monthly) {
        m.pct = maxRev > 0 ? m.amount / maxRev : 0;
      }

      // Top projects
      final topProj = (results[2] as List).map((p) => _TopItem(
        name: p['name'] as String,
        value: (p['spent'] as num).toDouble(),
      )).toList();
      final maxProj = topProj.isEmpty ? 1.0 : topProj.first.value;
      for (final p in topProj) { p.pct = maxProj > 0 ? p.value / maxProj : 0; }

      // Top workers this month
      final Map<String, _TopItem> workerMap = {};
      for (final att in (results[3] as List)) {
        final uid = att['user_id'] as String;
        final name = (att['users'] as Map?)?['full_name'] as String? ?? uid.substring(0, 8);
        final h = (att['hours_worked'] as num).toDouble();
        if (workerMap.containsKey(uid)) {
          workerMap[uid]!.value += h;
        } else {
          workerMap[uid] = _TopItem(name: name, value: h);
        }
      }
      final topWorkers = (workerMap.values.toList()..sort((a, b) => b.value.compareTo(a.value))).take(5).toList();
      final maxW = topWorkers.isEmpty ? 1.0 : topWorkers.first.value;
      for (final w in topWorkers) { w.pct = maxW > 0 ? w.value / maxW : 0; }

      setState(() {
        _totalInvoiced = invoiced;
        _totalCollected = collected;
        _totalHours = hours;
        _activeProjects = (results[4] as List).length;
        _monthlyRevenue = monthly;
        _topProjects = topProj.take(5).toList();
        _topWorkers = topWorkers.take(5).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _monthLabel(int m) => ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][m - 1];

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }

  double get _collectionRate => _totalInvoiced > 0 ? (_totalCollected / _totalInvoiced * 100) : 0;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Rapports')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // KPIs
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.5,
                    children: [
                      _KpiCard(label: 'Facturé (année)', value: '${_fmt(_totalInvoiced)} XOF', icon: Icons.receipt_long, color: cs.primary),
                      _KpiCard(label: 'Encaissé', value: '${_fmt(_totalCollected)} XOF', icon: Icons.account_balance_wallet, color: const Color(0xFF16A34A)),
                      _KpiCard(label: 'Taux encaissement', value: '${_collectionRate.toStringAsFixed(1)}%', icon: Icons.pie_chart_outline, color: const Color(0xFF7C3AED)),
                      _KpiCard(label: 'Heures travaillées', value: '${_totalHours}h', icon: Icons.access_time, color: const Color(0xFFEA580C)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _KpiCard(
                          label: 'Chantiers en cours',
                          value: '$_activeProjects',
                          icon: Icons.construction_outlined,
                          color: const Color(0xFF0891B2),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // CA mensuel
                  Text('CA mensuel (6 mois)', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: _monthlyRevenue.map((m) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              SizedBox(width: 32, child: Text(m.month, style: Theme.of(context).textTheme.bodySmall, overflow: TextOverflow.ellipsis)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Stack(
                                  children: [
                                    Container(height: 20, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(4))),
                                    FractionallySizedBox(
                                      widthFactor: m.pct,
                                      child: Container(height: 20, decoration: BoxDecoration(color: cs.primary, borderRadius: BorderRadius.circular(4))),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              SizedBox(width: 56, child: Text(_fmt(m.amount), style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500), textAlign: TextAlign.right)),
                            ],
                          ),
                        )).toList(),
                      ),
                    ),
                  ),

                  if (_topProjects.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text('Top chantiers (dépenses)', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: _topProjects.map((p) => _BarRow(item: p, color: const Color(0xFFEA580C), fmt: _fmt, unit: 'XOF')).toList(),
                        ),
                      ),
                    ),
                  ],

                  if (_topWorkers.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text('Top travailleurs (heures ce mois)', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: _topWorkers.map((w) => _BarRow(item: w, color: cs.primary, fmt: (v) => '${v.toStringAsFixed(0)}h', unit: '')).toList(),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _KpiCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 20),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: color)),
                Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BarRow extends StatelessWidget {
  final _TopItem item;
  final Color color;
  final String Function(double) fmt;
  final String unit;
  const _BarRow({required this.item, required this.color, required this.fmt, required this.unit});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.name, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
              Text(fmt(item.value), style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600), textAlign: TextAlign.right),
            ],
          ),
          const SizedBox(height: 3),
          Stack(
            children: [
              Container(height: 6, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(3))),
              FractionallySizedBox(
                widthFactor: item.pct,
                child: Container(height: 6, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MonthRevenue {
  final String month;
  double amount;
  double pct;
  _MonthRevenue({required this.month, required this.amount, this.pct = 0}); // ignore: unused_element_parameter
}

class _TopItem {
  final String name;
  double value;
  double pct;
  _TopItem({required this.name, required this.value, this.pct = 0}); // ignore: unused_element_parameter
}
