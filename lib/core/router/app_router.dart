import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/signup_page.dart';
import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/projects/presentation/projects_page.dart';
import '../../features/projects/presentation/project_detail_page.dart';
import '../../features/projects/presentation/project_form_page.dart';
import '../../features/teams/presentation/teams_page.dart';
import '../../features/teams/presentation/attendance_page.dart';
import '../../features/teams/presentation/team_form_page.dart';
import '../../features/teams/presentation/team_detail_page.dart';
import '../../features/quotes/presentation/quotes_page.dart';
import '../../features/quotes/presentation/quote_detail_page.dart';
import '../../features/quotes/presentation/quote_ai_page.dart';
import '../../features/quotes/presentation/quote_form_page.dart';
import '../../features/quotes/presentation/quote_templates_page.dart';
import '../../features/invoices/presentation/invoices_page.dart';
import '../../features/invoices/presentation/invoice_detail_page.dart';
import '../../features/invoices/presentation/invoice_form_page.dart';
import '../../shared/models/models.dart' show Invoice, Quote, Team;
import '../../features/materials/presentation/materials_page.dart';
import '../../features/materials/presentation/material_form_page.dart';
import '../../features/materials/presentation/material_detail_page.dart';
import '../../features/materials/presentation/movement_form_page.dart';
import '../../features/notifications/presentation/notifications_page.dart';
import '../../features/portal/presentation/portal_quotes_page.dart';
import '../../features/portal/presentation/portal_invoices_page.dart';
import '../../features/reports/presentation/reports_page.dart';
import '../../features/settings/presentation/settings_page.dart';
import '../../features/stock/presentation/stock_page.dart';
import '../../features/metres/presentation/metres_page.dart';
import '../../features/metres/presentation/ouvrage_form_page.dart';
import '../../features/clients/presentation/clients_page.dart';
import '../../features/clients/presentation/client_form_page.dart';
import '../../features/clients/presentation/client_detail_page.dart';
import '../shell/app_shell.dart';
import '../shell/client_shell.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

String? _cachedRole;
String? _cachedUid;

GoRouter buildRouter() {
  // Clear role cache on every sign-in so a role change on the backend
  // is picked up at the next session without killing the app.
  Supabase.instance.client.auth.onAuthStateChange.listen((data) {
    if (data.event == AuthChangeEvent.signedIn ||
        data.event == AuthChangeEvent.tokenRefreshed) {
      _cachedRole = null;
      _cachedUid = null;
    }
  });

  return GoRouter(
      navigatorKey: _rootKey,
      initialLocation: '/dashboard',
      redirect: (context, state) async {
        final session = Supabase.instance.client.auth.currentSession;
        final isAuth = session != null;
        if (!isAuth) { _cachedRole = null; _cachedUid = null; }
        final loc = state.matchedLocation;
        final isAuthRoute = loc.startsWith('/login') || loc.startsWith('/signup');
        final isPortal = loc.startsWith('/portal');

        if (!isAuth && !isAuthRoute) return '/login';
        if (isAuth && isAuthRoute) {
          final uid = session.user.id;
          try {
            if (_cachedUid != uid) {
              final data = await Supabase.instance.client.from('users').select('role').eq('id', uid).single();
              _cachedRole = data['role'] as String?;
              _cachedUid = uid;
            }
            if (_cachedRole == 'client') return '/portal/quotes';
          } catch (_) {}
          return '/dashboard';
        }
        // Client qui essaie d'accéder au dashboard → portail
        if (isAuth && !isPortal && !isAuthRoute) {
          final uid = session.user.id;
          try {
            if (_cachedUid != uid) {
              final data = await Supabase.instance.client.from('users').select('role').eq('id', uid).single();
              _cachedRole = data['role'] as String?;
              _cachedUid = uid;
            }
            if (_cachedRole == 'client') return '/portal/quotes';
          } catch (_) {}
        }
        return null;
      },
      refreshListenable: GoRouterRefreshStream(
        Supabase.instance.client.auth.onAuthStateChange,
      ),
      routes: [
        GoRoute(path: '/login', builder: (_, $) => const LoginPage()),
        GoRoute(path: '/signup', builder: (_, $) => const SignupPage()),
        ShellRoute(
          navigatorKey: _shellKey,
          builder: (context, state, child) => AppShell(child: child),
          routes: [
            GoRoute(path: '/dashboard', builder: (_, $) => const DashboardPage()),
            GoRoute(
              path: '/projects',
              builder: (_, $) => const ProjectsPage(),
              routes: [
                GoRoute(path: 'new', builder: (_, $) => const ProjectFormPage()),
                GoRoute(
                  path: ':id',
                  builder: (_, state) => ProjectDetailPage(id: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'edit',
                      builder: (_, state) => ProjectFormPage(project: state.extra as dynamic),
                    ),
                  ],
                ),
              ],
            ),
            GoRoute(
              path: '/teams',
              builder: (_, $) => const TeamsPage(),
              routes: [
                GoRoute(path: 'new', builder: (_, $) => const TeamFormPage()),
                GoRoute(
                  path: ':id',
                  builder: (_, state) => TeamDetailPage(id: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'edit',
                      builder: (_, state) => TeamFormPage(team: state.extra as Team?),
                    ),
                    GoRoute(
                      path: 'attendance',
                      builder: (_, state) =>
                          AttendancePage(teamId: state.pathParameters['id']!),
                    ),
                  ],
                ),
              ],
            ),
            GoRoute(path: '/attendance', builder: (_, $) => const AttendancePage(teamId: null)),
            GoRoute(
              path: '/metres',
              builder: (_, $) => const MetresPage(),
              routes: [
                GoRoute(path: 'new', builder: (_, $) => const OuvrageFormPage()),
              ],
            ),
            GoRoute(
              path: '/quotes',
              builder: (_, $) => const QuotesPage(),
              routes: [
                GoRoute(path: 'ai', builder: (_, $) => const QuoteAiPage()),
                GoRoute(path: 'templates', builder: (_, $) => const QuoteTemplatesPage()),
                GoRoute(path: 'new', builder: (_, $) => const QuoteFormPage()),
                GoRoute(
                  path: ':id',
                  builder: (_, state) => QuoteDetailPage(id: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'edit',
                      builder: (_, state) => QuoteFormPage(quote: state.extra as Quote?),
                    ),
                  ],
                ),
              ],
            ),
            GoRoute(
              path: '/invoices',
              builder: (_, $) => const InvoicesPage(),
              routes: [
                GoRoute(
                  path: 'new',
                  builder: (_, $) => const InvoiceFormPage(),
                ),
                GoRoute(
                  path: ':id',
                  builder: (_, state) => InvoiceDetailPage(id: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'edit',
                      builder: (_, state) => InvoiceFormPage(invoice: state.extra as Invoice?),
                    ),
                  ],
                ),
              ],
            ),
            GoRoute(
              path: '/materials',
              builder: (_, $) => const MaterialsPage(),
              routes: [
                GoRoute(path: 'new', builder: (_, $) => const MaterialFormPage()),
                GoRoute(
                  path: 'movement',
                  builder: (_, state) {
                    final extra = state.extra as Map<String, String>?;
                    return MovementFormPage(
                      materialId: extra?['materialId'],
                      materialName: extra?['materialName'],
                    );
                  },
                ),
                GoRoute(
                  path: ':id',
                  builder: (_, state) =>
                      MaterialDetailPage(id: state.pathParameters['id']!),
                ),
              ],
            ),
            GoRoute(
              path: '/clients',
              builder: (_, $) => const ClientsPage(),
              routes: [
                GoRoute(path: 'new', builder: (_, $) => const ClientFormPage()),
                GoRoute(
                  path: ':id',
                  builder: (_, state) => ClientDetailPage(id: state.pathParameters['id']!),
                ),
              ],
            ),
            GoRoute(path: '/notifications', builder: (_, $) => const NotificationsPage()),
            GoRoute(path: '/reports', builder: (_, $) => const ReportsPage()),
            GoRoute(path: '/settings', builder: (_, $) => const SettingsPage()),
            GoRoute(path: '/stock', builder: (_, $) => const StockPage()),
          ],
        ),
        // ── Portail client ──────────────────────────────────────
        ShellRoute(
          navigatorKey: GlobalKey<NavigatorState>(),
          builder: (context, state, child) => ClientShell(child: child),
          routes: [
            GoRoute(path: '/portal/quotes', builder: (_, $) => const PortalQuotesPage()),
            GoRoute(path: '/portal/invoices', builder: (_, $) => const PortalInvoicesPage()),
          ],
        ),
      ],
    );
  }

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _sub = stream.listen((_) => notifyListeners());
  }
  late final dynamic _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
