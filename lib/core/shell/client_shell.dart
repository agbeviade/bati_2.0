import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../connectivity/offline_banner.dart';

/// Shell minimal pour les utilisateurs de role 'client'.
/// Seules les pages Devis et Factures sont accessibles.
class ClientShell extends StatelessWidget {
  final Widget child;
  const ClientShell({super.key, required this.child});

  static const _tabs = [
    _TabItem(icon: Icons.description_outlined, activeIcon: Icons.description, label: 'Mes devis', path: '/portal/quotes'),
    _TabItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Mes factures', path: '/portal/invoices'),
  ];

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/portal/invoices')) return 1;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: child),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        destinations: _tabs.map((t) => NavigationDestination(
          icon: Icon(t.icon),
          selectedIcon: Icon(t.activeIcon),
          label: t.label,
        )).toList(),
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
