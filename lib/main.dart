import 'dart:async';
import 'package:flutter/foundation.dart';
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

/// Trace boot — visible dans logcat ET affichable à l'écran si l'app crashe.
/// Tant qu'on n'a pas Sentry/Crashlytics, c'est notre seul moyen de diagnostiquer
/// un écran noir sur un APK release distribué.
final List<String> _bootLog = <String>[];
void _trace(String line) {
  _bootLog.add(line);
  debugPrint('[boot] $line');
}

Future<void> _safe(String name, Future<void> Function() init) async {
  _trace('$name…');
  try {
    await init();
    _trace('$name OK');
  } catch (e, st) {
    _trace('$name FAILED: $e');
    debugPrint('$st');
  }
}

void main() {
  // runZonedGuarded capture toute erreur async non gérée. Sans ça, une exception
  // dans un microtask peut tuer l'app SANS qu'on voie rien (juste écran noir).
  runZonedGuarded(_bootstrap, (e, st) {
    _trace('UNCAUGHT ZONE ERROR: $e');
    debugPrint('$st');
    // Si runApp n'a jamais été appelé, on tente une UI de secours.
    runApp(_BootErrorApp(error: '$e', stack: '$st', boot: _bootLog));
  });
}

Future<void> _bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  _trace('Flutter binding OK');

  // Remplace l'écran rouge par défaut par une carte lisible — utile en release
  // où ErrorWidget par défaut affiche un fond gris/noir illisible.
  ErrorWidget.builder = (details) => _ErrorScreen(message: '${details.exception}');

  // FlutterError = erreurs framework (build, layout). Sans handler, un crash
  // dans build() peut donner un écran noir.
  FlutterError.onError = (details) {
    _trace('FlutterError: ${details.exception}');
    FlutterError.presentError(details);
  };

  // Erreurs async non capturées par le framework (futures non gérées).
  PlatformDispatcher.instance.onError = (e, st) {
    _trace('PlatformDispatcher: $e');
    debugPrint('$st');
    return true;
  };

  try {
    timeago.setLocaleMessages('fr', timeago.FrMessages());
  } catch (e) {
    _trace('timeago locale failed: $e');
  }

  await Future.wait([
    _safe('OnboardingRepo', OnboardingRepo.init),
    _safe('JsonCache', JsonCache.init),
    _safe('SyncQueue', SyncQueue.init),
  ]);

  await _safe(
    'Supabase',
    () => Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey),
  );

  await _safe('NotificationService', () => NotificationService().init());

  try {
    syncWorker.start();
    _trace('syncWorker OK');
  } catch (e) {
    _trace('syncWorker FAILED: $e');
  }

  _trace('runApp');
  runApp(const ProviderScope(child: BatiFlowApp()));
}

class BatiFlowApp extends StatelessWidget {
  const BatiFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    try {
      return MaterialApp.router(
        title: 'BatiFlow',
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        routerConfig: buildRouter(),
        debugShowCheckedModeBanner: false,
      );
    } catch (e, st) {
      // Dernier filet : si buildRouter() throw, on affiche l'erreur au lieu
      // de planter le widget tree et provoquer un écran noir.
      return _BootErrorApp(error: '$e', stack: '$st', boot: _bootLog);
    }
  }
}

/// UI de secours utilisée quand main() / buildRouter() / une zone explose.
/// Forcée en thème clair pour rester lisible quoi qu'il arrive.
class _BootErrorApp extends StatelessWidget {
  final String error;
  final String stack;
  final List<String> boot;
  const _BootErrorApp({required this.error, required this.stack, required this.boot});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BatiFlow — erreur de démarrage',
      theme: ThemeData.light(),
      debugShowCheckedModeBanner: false,
      home: _ErrorScreen(message: error, stack: stack, boot: boot),
    );
  }
}

class _ErrorScreen extends StatelessWidget {
  final String message;
  final String? stack;
  final List<String>? boot;
  const _ErrorScreen({required this.message, this.stack, this.boot});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              const Text(
                'BatiFlow — erreur au démarrage',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              SelectableText(message, style: const TextStyle(fontFamily: 'monospace')),
              if (boot != null && boot!.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text('Boot trace :', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                SelectableText(
                  boot!.join('\n'),
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ],
              if (stack != null && kDebugMode) ...[
                const SizedBox(height: 16),
                const Text('Stack :', style: TextStyle(fontWeight: FontWeight.bold)),
                SelectableText(
                  stack!,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 10),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
