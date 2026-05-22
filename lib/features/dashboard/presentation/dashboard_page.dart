import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/services/notification_service.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  bool _loading = true;
  int _activeProjects = 0;
  int _overdueInvoices = 0;
  int _lowStockItems = 0;
  double _monthRevenue = 0;
  List<Project> _recentProjects = [];

  @override
  void initState() {
    super.initState();
    _load();
    // Vérifie les alertes et envoie des notifications locales (une fois au démarrage)
    NotificationService().checkAndNotify();
  }

  Future<void> _load() async {
    final client = Supabase.instance.client;
    try {
      final now = DateTime.now();
      final firstOfMonth = DateTime(now.year, now.month, 1).toIso8601String();

      final results = await Future.wait([
        client.from('projects').select('id').eq('status', 'in_progress'),
        client.from('invoices').select('id').inFilter('status', ['sent', 'overdue']).lt('due_date', now.toIso8601String()),
        client.from('materials').select('id').gt('min_stock_qty', 0),
        client.from('invoices').select('amount').eq('status', 'paid').gte('created_at', firstOfMonth),
        client.from('projects').select('id, name, status, progress_pct, budget, spent').order('created_at', ascending: false).limit(5),
      ]);

      double revenue = 0;
      for (final inv in (results[3] as List)) {
        revenue += (inv['amount'] as num?)?.toDouble() ?? 0;
      }

      setState(() {
        _activeProjects = (results[0] as List).length;
        _overdueInvoices = (results[1] as List).length;
        _lowStockItems = (results[2] as List).length;
        _monthRevenue = revenue;
        _recentProjects = (results[4] as List).map((j) => Project.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('BatiFlow'),
        actions: [
          IconButton(
            icon: Badge(
              isLabelVisible: _overdueInvoices > 0 || _lowStockItems > 0,
              child: const Icon(Icons.notifications_outlined),
            ),
            onPressed: () => context.go('/notifications'),
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
                  _buildKpiGrid(cs),
                  if (_overdueInvoices > 0 || _lowStockItems > 0) ...[
                    const SizedBox(height: 16),
                    _buildAlerts(cs),
                  ],
                  const SizedBox(height: 24),
                  Text('Chantiers récents', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  ..._recentProjects.map((p) => _ProjectCard(project: p)),
                  if (_recentProjects.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text('Aucun chantier', style: TextStyle(color: cs.onSurfaceVariant)),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildKpiGrid(ColorScheme cs) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.6,
      children: [
        _KpiCard(label: 'Chantiers actifs', value: '$_activeProjects', icon: Icons.construction, color: cs.primary, onTap: () => context.go('/projects')),
        _KpiCard(label: 'CA ce mois', value: _formatAmount(_monthRevenue), icon: Icons.trending_up, color: const Color(0xFF16A34A)),
        _KpiCard(label: 'Factures en retard', value: '$_overdueInvoices', icon: Icons.warning_amber_outlined, color: const Color(0xFFDC2626), onTap: () => context.go('/invoices')),
        _KpiCard(label: 'Stock faible', value: '$_lowStockItems', icon: Icons.inventory_2_outlined, color: const Color(0xFFEA580C), onTap: () => context.go('/materials')),
      ],
    );
  }

  Widget _buildAlerts(ColorScheme cs) {
    return Column(
      children: [
        if (_overdueInvoices > 0)
          _AlertBanner(
            icon: Icons.receipt_long,
            message: '$_overdueInvoices facture${_overdueInvoices > 1 ? 's' : ''} en retard de paiement',
            color: const Color(0xFFFEE2E2),
            iconColor: const Color(0xFFDC2626),
            onTap: () => context.go('/invoices'),
          ),
        if (_lowStockItems > 0)
          _AlertBanner(
            icon: Icons.inventory_2,
            message: '$_lowStockItems matériau${_lowStockItems > 1 ? 'x' : ''} en stock faible',
            color: const Color(0xFFFFF7ED),
            iconColor: const Color(0xFFEA580C),
            onTap: () => context.go('/materials'),
          ),
      ],
    );
  }

  String _formatAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _KpiCard({required this.label, required this.value, required this.icon, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 22),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, color: color)),
                  Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  final IconData icon;
  final String message;
  final Color color;
  final Color iconColor;
  final VoidCallback? onTap;

  const _AlertBanner({required this.icon, required this.message, required this.color, required this.iconColor, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
        child: Row(
          children: [
            Icon(icon, color: iconColor, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(message, style: TextStyle(fontSize: 13, color: iconColor, fontWeight: FontWeight.w500))),
            Icon(Icons.chevron_right, color: iconColor, size: 18),
          ],
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final Project project;
  const _ProjectCard({required this.project});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => context.go('/projects/${project.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text(project.name, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
                  ProjectStatusBadge(status: project.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: project.progressPct / 100,
                        backgroundColor: const Color(0xFFE2E8F0),
                        minHeight: 6,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text('${project.progressPct}%', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
