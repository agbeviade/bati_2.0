import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/services/notification_service.dart';
import '../../../core/theme/app_theme.dart';
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
  double _monthRevenue = 0;
  int _ouvragesCount = 0;
  List<Project> _recentProjects = [];
  String? _userName;

  @override
  void initState() {
    super.initState();
    _load();
    NotificationService().checkAndNotify();
  }

  Future<void> _load() async {
    final client = Supabase.instance.client;
    try {
      final now = DateTime.now();
      final firstOfMonth = DateTime(now.year, now.month, 1).toIso8601String();
      final uid = client.auth.currentUser?.id;

      final results = await Future.wait([
        client.from('projects').select('id').eq('status', 'in_progress'),
        client.from('invoices').select('id').inFilter('status', ['sent', 'overdue']).lt('due_date', now.toIso8601String()),
        client.from('invoices').select('amount').eq('status', 'paid').gte('created_at', firstOfMonth),
        client.from('projects').select('id, company_id, name, status, progress_pct, budget, spent').order('created_at', ascending: false).limit(4),
        client.from('project_ouvrages').select('id'),
        if (uid != null) client.from('users').select('full_name').eq('id', uid).maybeSingle(),
      ]);

      double revenue = 0;
      for (final inv in (results[2] as List)) {
        revenue += (inv['amount'] as num?)?.toDouble() ?? 0;
      }

      setState(() {
        _activeProjects = (results[0] as List).length;
        _overdueInvoices = (results[1] as List).length;
        _monthRevenue = revenue;
        _recentProjects = (results[3] as List).map((j) => Project.fromJson(j)).toList();
        _ouvragesCount = (results[4] as List).length;
        if (uid != null && results.length > 5) {
          final profile = results[5] as Map<String, dynamic>?;
          _userName = profile?['full_name'] as String?;
        }
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            _HeroHeader(
              greeting: _greeting,
              userName: _userName,
              overdueCount: _overdueInvoices,
              onNotifTap: () => context.go('/notifications'),
            ),
            if (_loading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _KpiRow(
                        activeProjects: _activeProjects,
                        monthRevenue: _monthRevenue,
                        overdueInvoices: _overdueInvoices,
                        ouvragesCount: _ouvragesCount,
                        onProjectsTap: () => context.go('/projects'),
                        onInvoicesTap: () => context.go('/invoices'),
                        onMetresTap: () => context.go('/metres'),
                      ),
                      if (_overdueInvoices > 0) ...[
                        const SizedBox(height: 16),
                        _AlertBanner(
                          icon: Icons.receipt_long_rounded,
                          message: '$_overdueInvoices facture${_overdueInvoices > 1 ? 's' : ''} en retard',
                          color: const Color(0xFFFEF2F2),
                          borderColor: const Color(0xFFFECACA),
                          iconColor: AppColors.redDark,
                          onTap: () => context.go('/invoices'),
                        ),
                      ],
                      const SizedBox(height: 24),
                      _SectionHeader(
                        title: 'Chantiers récents',
                        action: 'Tout voir',
                        onAction: () => context.go('/projects'),
                      ),
                      const SizedBox(height: 12),
                      if (_recentProjects.isEmpty)
                        _EmptySection(
                          icon: Icons.construction_rounded,
                          message: 'Aucun chantier pour l\'instant',
                        )
                      else
                        ..._recentProjects.map((p) => _ProjectCard(project: p)),
                      const SizedBox(height: 16),
                      _QuickActionsRow(),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _HeroHeader extends StatelessWidget {
  final String greeting;
  final String? userName;
  final int overdueCount;
  final VoidCallback onNotifTap;

  const _HeroHeader({
    required this.greeting,
    required this.userName,
    required this.overdueCount,
    required this.onNotifTap,
  });

  @override
  Widget build(BuildContext context) {
    final name = userName?.split(' ').first ?? 'Chef';
    return SliverAppBar(
      expandedHeight: 160,
      pinned: true,
      backgroundColor: AppColors.primaryDark,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(gradient: AppColors.gradientHero),
          child: Stack(
            children: [
              // Decorative circles
              Positioned(
                right: -30,
                top: -20,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
              ),
              Positioned(
                right: 40,
                top: 60,
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '$greeting, $name',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _formatDate(),
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: onNotifTap,
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                                  ),
                                  child: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
                                ),
                                if (overdueCount > 0)
                                  Positioned(
                                    top: -4,
                                    right: -4,
                                    child: Container(
                                      width: 18,
                                      height: 18,
                                      decoration: const BoxDecoration(
                                        color: AppColors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          '$overdueCount',
                                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        collapseMode: CollapseMode.parallax,
      ),
    );
  }

  String _formatDate() {
    final days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    final months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    final now = DateTime.now();
    return '${days[now.weekday % 7]} ${now.day} ${months[now.month - 1]} ${now.year}';
  }
}

class _KpiRow extends StatelessWidget {
  final int activeProjects;
  final double monthRevenue;
  final int overdueInvoices;
  final int ouvragesCount;
  final VoidCallback onProjectsTap;
  final VoidCallback onInvoicesTap;
  final VoidCallback onMetresTap;

  const _KpiRow({
    required this.activeProjects,
    required this.monthRevenue,
    required this.overdueInvoices,
    required this.ouvragesCount,
    required this.onProjectsTap,
    required this.onInvoicesTap,
    required this.onMetresTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _GradientKpiCard(
                label: 'Chantiers actifs',
                value: '$activeProjects',
                icon: Icons.construction_rounded,
                gradient: AppColors.gradientHero,
                onTap: onProjectsTap,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _GradientKpiCard(
                label: 'CA ce mois',
                value: _fmt(monthRevenue),
                icon: Icons.trending_up_rounded,
                gradient: AppColors.gradientGreen,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _GradientKpiCard(
                label: 'Factures en retard',
                value: '$overdueInvoices',
                icon: Icons.warning_amber_rounded,
                gradient: overdueInvoices > 0 ? AppColors.gradientRed : AppColors.gradientOrange,
                onTap: onInvoicesTap,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _GradientKpiCard(
                label: 'Métrés calculés',
                value: '$ouvragesCount',
                icon: Icons.square_foot,
                gradient: AppColors.gradientViolet,
                onTap: onMetresTap,
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) { final m = v / 1000000; return '${m == m.roundToDouble() ? m.toStringAsFixed(0) : m.toStringAsFixed(1)}M'; }
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }
}

class _GradientKpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final LinearGradient gradient;
  final VoidCallback? onTap;

  const _GradientKpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: gradient.colors.last.withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: Colors.white, size: 18),
                ),
                if (onTap != null)
                  Icon(Icons.arrow_forward_ios_rounded, color: Colors.white.withValues(alpha: 0.6), size: 12),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.8),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  final IconData icon;
  final String message;
  final Color color;
  final Color borderColor;
  final Color iconColor;
  final VoidCallback? onTap;

  const _AlertBanner({
    required this.icon,
    required this.message,
    required this.color,
    required this.borderColor,
    required this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 16),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: TextStyle(fontSize: 13, color: iconColor, fontWeight: FontWeight.w600),
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: iconColor.withValues(alpha: 0.6), size: 18),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;

  const _SectionHeader({required this.title, this.action, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            letterSpacing: -0.2,
          ),
        ),
        if (action != null)
          GestureDetector(
            onTap: onAction,
            child: Text(
              action!,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
      ],
    );
  }
}

class _EmptySection extends StatelessWidget {
  final IconData icon;
  final String message;

  const _EmptySection({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.textSecondary.withValues(alpha: 0.4), size: 36),
          const SizedBox(height: 8),
          Text(message, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final Project project;
  const _ProjectCard({required this.project});

  @override
  Widget build(BuildContext context) {
    final progress = project.progressPct / 100;
    return GestureDetector(
      onTap: () => context.go('/projects/${project.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientHero,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.construction_rounded, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        project.name,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      _BudgetRow(budget: project.budget, spent: project.spent),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                ProjectStatusBadge(status: project.status),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        progress < 0.3
                            ? AppColors.red
                            : progress < 0.7
                                ? AppColors.amber
                                : AppColors.green,
                      ),
                      minHeight: 7,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '${project.progressPct}%',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BudgetRow extends StatelessWidget {
  final double? budget;
  final double spent;
  const _BudgetRow({required this.budget, required this.spent});

  String _fmt(double v) {
    if (v >= 1000000) { final m = v / 1000000; return '${m == m.roundToDouble() ? m.toStringAsFixed(0) : m.toStringAsFixed(1)}M'; }
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }

  @override
  Widget build(BuildContext context) {
    final b = budget;
    if (b == null || b <= 0) return const SizedBox.shrink();
    return Text(
      '${_fmt(spent)} / ${_fmt(b)} FCFA',
      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
    );
  }
}

class _QuickActionsRow extends StatelessWidget {
  const _QuickActionsRow();

  @override
  Widget build(BuildContext context) {
    final actions = [
      _QuickAction(icon: Icons.add_circle_outline_rounded, label: 'Nouveau\nchantier', color: AppColors.primary, onTap: () => context.go('/projects/new')),
      _QuickAction(icon: Icons.description_outlined, label: 'Créer\ndevis', color: AppColors.violet, onTap: () => context.go('/quotes')),
      _QuickAction(icon: Icons.inventory_2_outlined, label: 'Stock\nmatériaux', color: AppColors.orange, onTap: () => context.go('/materials')),
      _QuickAction(icon: Icons.bar_chart_outlined, label: 'Voir\nrapports', color: AppColors.green, onTap: () => context.go('/reports')),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(title: 'Actions rapides'),
        const SizedBox(height: 12),
        Row(
          children: actions.map((a) => Expanded(child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: _QuickActionTile(action: a),
          ))).toList(),
        ),
      ],
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  final _QuickAction action;
  const _QuickActionTile({required this.action});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: action.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: action.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: action.color.withValues(alpha: 0.15)),
        ),
        child: Column(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [action.color.withValues(alpha: 0.8), action.color],
                ),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(action.icon, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 6),
            Text(
              action.label,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: action.color, height: 1.3),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});
}
