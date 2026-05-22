import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _tabs = [
    _TabItem(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Accueil', path: '/dashboard'),
    _TabItem(icon: Icons.construction_outlined, activeIcon: Icons.construction, label: 'Chantiers', path: '/projects'),
    _TabItem(icon: Icons.fingerprint_outlined, activeIcon: Icons.fingerprint, label: 'Pointage', path: '/attendance'),
    _TabItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Factures', path: '/invoices'),
    _TabItem(icon: Icons.more_horiz, activeIcon: Icons.more_horiz, label: 'Plus', path: '/more'),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/projects')) return 1;
    if (location.startsWith('/attendance') || location.startsWith('/teams')) return 2;
    if (location.startsWith('/invoices')) return 3;
    return 4;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    final location = GoRouterState.of(context).matchedLocation;
    final isMoreSection = ['/quotes', '/materials', '/reports', '/notifications', '/settings'].any((p) => location.startsWith(p));

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: isMoreSection ? 4 : index,
        onDestinationSelected: (i) {
          if (i == 4) {
            _showMoreSheet(context);
          } else {
            context.go(_tabs[i].path);
          }
        },
        destinations: _tabs
            .map((t) => NavigationDestination(
                  icon: Icon(t.icon),
                  selectedIcon: Icon(t.activeIcon),
                  label: t.label,
                ))
            .toList(),
      ),
    );
  }

  void _showMoreSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _MoreSheet(),
    );
  }
}

class _MoreSheet extends StatelessWidget {
  const _MoreSheet();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final items = [
      _MoreItem(icon: Icons.description_outlined, label: 'Devis', path: '/quotes', color: const Color(0xFF7C3AED)),
      _MoreItem(icon: Icons.inventory_2_outlined, label: 'Matériaux & Stock', path: '/materials', color: const Color(0xFFEA580C)),
      _MoreItem(icon: Icons.groups_outlined, label: 'Équipes', path: '/teams', color: const Color(0xFF0891B2)),
      _MoreItem(icon: Icons.bar_chart_outlined, label: 'Rapports', path: '/reports', color: const Color(0xFF16A34A)),
      _MoreItem(icon: Icons.notifications_outlined, label: 'Notifications', path: '/notifications', color: const Color(0xFFDC2626)),
      _MoreItem(icon: Icons.settings_outlined, label: 'Paramètres', path: '/settings', color: cs.onSurfaceVariant),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: cs.outlineVariant, borderRadius: BorderRadius.circular(2))),
          Text('Navigation', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: cs.onSurfaceVariant)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.2,
            children: items.map((item) => _MoreTile(item: item)).toList(),
          ),
        ],
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  final _MoreItem item;
  const _MoreTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () {
        Navigator.pop(context);
        context.go(item.path);
      },
      child: Container(
        decoration: BoxDecoration(
          color: item.color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: item.color.withValues(alpha: 0.15)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: item.color, size: 26),
            const SizedBox(height: 6),
            Text(item.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: item.color), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _TabItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final String path;
  const _TabItem({required this.icon, required this.activeIcon, required this.label, required this.path});
}

class _MoreItem {
  final IconData icon;
  final String label;
  final String path;
  final Color color;
  const _MoreItem({required this.icon, required this.label, required this.path, required this.color});
}
