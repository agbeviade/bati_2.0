import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'core/cache/json_cache.dart';
import 'core/queue/sync_queue.dart';
import 'core/queue/sync_worker.dart';
import 'core/router/app_router.dart';
import 'core/services/notification_service.dart';
import 'core/supabase/supabase_config.dart';
import 'core/theme/app_theme.dart';
import 'features/onboarding/data/onboarding_repo.dart';

/// Wrapper qui exécute une init avec catch : on ne veut JAMAIS qu'une init
/// foireuse bloque l'appel à `runApp()` → écran noir. Mieux vaut une UI
/// dégradée qu'une app qui refuse de démarrer.
Future<void> _safe(String name, Future<void> Function() init) async {
  try {
    await init();
  } catch (e, st) {
    debugPrint('[main] $name FAILED: $e\n$st');
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Locale timeago (sync — pas async)
  try {
    timeago.setLocaleMessages('fr', timeago.FrMessages());
  } catch (e) {
    debugPrint('[main] timeago locale failed: $e');
  }

  // Inits parallèles — pas de dépendance entre elles, on gagne du temps
  await Future.wait([
    _safe('OnboardingRepo', OnboardingRepo.init),
    _safe('JsonCache', JsonCache.init),
    _safe('SyncQueue', SyncQueue.init),
  ]);

  // Supabase doit être init avant NotificationService (qui requête)
  await _safe(
    'Supabase',
    () => Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey),
  );

  await _safe('NotificationService', () => NotificationService().init());

  // syncWorker start est sync, mais on garde le pattern
  try {
    syncWorker.start();
  } catch (e) {
    debugPrint('[main] syncWorker.start failed: $e');
  }

  runApp(const ProviderScope(child: BatiFlowApp()));
}

class BatiFlowApp extends StatelessWidget {
  const BatiFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BatiFlow',
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: buildRouter(),
      debugShowCheckedModeBanner: false,
    );
  }
}
