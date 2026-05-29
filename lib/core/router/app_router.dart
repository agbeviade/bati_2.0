import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/signup_page.dart';
import '../../features/onboarding/data/onboarding_repo.dart';
import '../../features/onboarding/presentation/onboarding_page.dart';
import '../../features/onboarding_company/presentation/onboarding_company_page.dart';
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
String? _cachedCompanyId;
String? _cachedUid;

/// Force le router à recharger role + company_id au prochain redirect.
/// À appeler après création de company (onboarding) pour que le redirect
/// sorte de /onboarding-company vers /dashboard.
void invalidateProfileCache() {
  _cachedRole = null;
  _cachedCompanyId = null;
  _cachedUid = null;
}

/// Charge role + company_id pour l'uid courant, met le cache à jour.
/// Retourne `(role, companyId)`. Sur erreur DB, retourne `(null, null)` —
/// le redirect tombera alors sur le fallback `/dashboard`.
Future<(String?, String?)> _loadProfile(String uid) async {
  if (_cachedUid == uid) return (_cachedRole, _cachedCompanyId);
  try {
    final data = await Supabase.instance.client
        .from('users')
        .select('role, company_id')
        .eq('id', uid)
        .single();
    _cachedRole = data['role'] as String?;
    _cachedCompanyId = data['company_id'] as String?;
    _cachedUid = uid;
    return (_cachedRole, _cachedCompanyId);
  } catch (_) {
    return (null, null);
  }
}

GoRouter buildRouter() {
  // Clear role cache on every sign-in so a role change on the backend
  // is picked up at the next session without killing the app.
  Supabase.instance.client.auth.onAuthStateChange.listen((data) {
    if (data.event == AuthChangeEvent.signedIn ||
        data.event == AuthChangeEvent.tokenRefreshed) {
      invalidateProfileCache();
    }
  });

  return GoRouter(
      navigatorKey: _rootKey,
      initialLocation: '/dashboard',
      redirect: (context, state) async {
        final session = Supabase.instance.client.auth.currentSession;
        final isAuth = session != null;
        if (!isAuth) invalidateProfileCache();
        final loc = state.matchedLocation;
        final isAuthRoute = loc.startsWith('/login') || loc.startsWith('/signup');
        final isWelcome = loc == '/onboarding';
        final isCompanyOnboarding = loc.startsWith('/onboarding-company');
        final isPortal = loc.startsWith('/portal');

        // Premier lancement (pas connecté) : afficher l'onboarding 4 slides.
        if (!isAuth && !OnboardingRepo.instance.hasSeenOnboarding && !isWelcome) {
          return '/onboarding';
        }
        // Onboarding bienvenue déjà vu et connecté → /dashboard
        if (isWelcome && OnboardingRepo.instance.hasSeenOnboarding && isAuth) {
          return '/dashboard';
        }
        // Non connecté → /login
        if (!isAuth && !isAuthRoute && !isWelcome) return '/login';

        // À partir d'ici, on peut être SOIT auth, SOIT sur /onboarding ou /login
        // (les seuls cas non-auth restants après les checks précédents). Si pas
        // de session, on n'a pas besoin de charger le profil — on est déjà sur
        // une page autorisée pour les anonymes. Cette garde évite un crash
        // `Null check operator used on a null value` sur session!.user.id.
        if (session == null) return null;

        final uid = session.user.id;
        final (role, companyId) = await _loadProfile(uid);

        // Client → portail (priorité sur le check company_id, les clients
        // sont créés par une admin et ont leur company_id assignée d'avance)
        if (role == 'client' && !isPortal) return '/portal/quotes';

        // Pas de company → onboarding entreprise (sauf si on y est déjà
        // ou sur une route auth)
        if (role != 'client' &&
            companyId == null &&
            !isCompanyOnboarding &&
            !isAuthRoute) {
          return '/onboarding-company';
        }
        // Company déjà créée → bloquer l'accès à /onboarding-company
        if (isCompanyOnboarding && companyId != null) {
          return '/dashboard';
        }

        // Vient de se connecter sur /login ou /signup → router vers la home
        if (isAuthRoute) {
          if (role == 'client') return '/portal/quotes';
          if (companyId == null) return '/onboarding-company';
          return '/dashboard';
        }

        return null;
      },
      refreshListenable: GoRouterRefreshStream(
        Supabase.instance.client.auth.onAuthStateChange,
      ),
      routes: [
        GoRoute(path: '/onboarding', builder: (_, $) => const OnboardingPage()),
        GoRoute(
          path: '/onboarding-company',
          builder: (_, $) => const OnboardingCompanyPage(),
        ),
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
