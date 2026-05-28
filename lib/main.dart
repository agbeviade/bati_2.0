import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'core/cache/json_cache.dart';
import 'core/router/app_router.dart';
import 'core/services/notification_service.dart';
import 'core/supabase/supabase_config.dart';
import 'core/theme/app_theme.dart';
import 'features/onboarding/data/onboarding_repo.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  timeago.setLocaleMessages('fr', timeago.FrMessages());
  await OnboardingRepo.init();
  await JsonCache.init();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  await NotificationService().init();
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
