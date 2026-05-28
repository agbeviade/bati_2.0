import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _tabs = [
    _TabItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Accueil', path: '/dashboard'),
    _TabItem(icon: Icons.construction_outlined, activeIcon: Icons.construction_rounded, label: 'Chantiers', path: '/projects'),
    _TabItem(icon: Icons.square_foot_outlined, activeIcon: Icons.square_foot, label: 'Métrés', path: '/metres'),
    _TabItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Factures', path: '/invoices'),
    _TabItem(icon: Icons.grid_view_rounded, activeIcon: Icons.grid_view_rounded, label: 'Plus', path: '/more'),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/projects')) return 1;
    if (location.startsWith('/metres')) return 2;
    if (location.startsWith('/invoices')) return 3;
    return 4;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    final location = GoRouterState.of(context).matchedLocation;
    final isMoreSection = ['/quotes', '/materials', '/stock', '/reports', '/notifications', '/settings', '/teams', '/attendance', '/clients']
        .any((p) => location.startsWith(p));

    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(
        selectedIndex: isMoreSection ? 4 : index,
        onSelected: (i) {
          if (i == 4) {
            _showMoreSheet(context);
          } else {
            context.go(_tabs[i].path);
          }
        },
      ),
    );
  }

  void _showMoreSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const _MoreSheet(),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  const _BottomNav({required this.selectedIndex, required this.onSelected});

  static const _tabs = AppShell._tabs;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 16, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: List.generate(_tabs.length, (i) {
              final selected = selectedIndex == i;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onSelected(i),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          decoration: BoxDecoration(
                            color: selected ? AppColors.primary.withValues(alpha: 0.12) : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            selected ? _tabs[i].activeIcon : _tabs[i].icon,
                            color: selected ? AppColors.primary : AppColors.textSecondary,
                            size: 22,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _tabs[i].label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                            color: selected ? AppColors.primary : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _MoreSheet extends StatelessWidget {
  const _MoreSheet();

  @override
  Widget build(BuildContext context) {
    final items = [
      _MoreItem(icon: Icons.description_outlined, label: 'Devis', path: '/quotes', color: AppColors.violet),
      _MoreItem(icon: Icons.people_outline, label: 'Clients', path: '/clients', color: AppColors.cyan),
      _MoreItem(icon: Icons.inventory_2_outlined, label: 'Matériaux', path: '/materials', color: AppColors.orange),
      _MoreItem(icon: Icons.warehouse_outlined, label: 'Stock', path: '/stock', color: AppColors.green),
      _MoreItem(icon: Icons.groups_outlined, label: 'Équipes', path: '/teams', color: AppColors.primary),
      _MoreItem(icon: Icons.fingerprint_outlined, label: 'Pointage', path: '/attendance', color: AppColors.green),
      _MoreItem(icon: Icons.bar_chart_outlined, label: 'Rapports', path: '/reports', color: AppColors.violet),
      _MoreItem(icon: Icons.notifications_outlined, label: 'Alertes', path: '/notifications', color: AppColors.red),
      _MoreItem(icon: Icons.settings_outlined, label: 'Paramètres', path: '/settings', color: AppColors.textSecondary),
    ];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                const Text(
                  'Navigation',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
            child: GridView.count(
              crossAxisCount: 4,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.0,
              children: items.map((item) => _MoreTile(item: item)).toList(),
            ),
          ),
          const SizedBox(height: 24),
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
    return GestureDetector(
      onTap: () {
        Navigator.pop(context);
        context.push(item.path);
      },
      child: Container(
        decoration: BoxDecoration(
          color: item.color.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: item.color.withValues(alpha: 0.12)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [item.color.withValues(alpha: 0.8), item.color],
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(item.icon, color: Colors.white, size: 18),
            ),
            const SizedBox(height: 6),
            Text(
              item.label,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: item.color),
              textAlign: TextAlign.center,
            ),
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
