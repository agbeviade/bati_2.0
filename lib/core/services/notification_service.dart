import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    _initialized = true;

    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    await _plugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: false);
  }

  /// Vérifie les alertes actives et pousse une notification système si besoin.
  /// Appelé depuis DashboardPage.initState().
  Future<void> checkAndNotify() async {
    if (!_initialized) return;
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    try {
      final now = DateTime.now().toUtc().toIso8601String();
      final results = await Future.wait<dynamic>([
        Supabase.instance.client
            .from('invoices')
            .select('id')
            .inFilter('status', ['sent', 'overdue'])
            .lt('due_date', now)
            .count(),
        Supabase.instance.client
            .from('quotes')
            .select('id')
            .eq('status', 'sent')
            .lt('valid_until', now.substring(0, 10))
            .count(),
      ]);

      final overdueInvoices = (results[0]).count as int;
      final expiredQuotes = (results[1]).count as int;

      if (overdueInvoices > 0) {
        await _show(
          id: 1001,
          title: 'Factures en retard',
          body: '$overdueInvoices facture${overdueInvoices > 1 ? 's' : ''} '
              '${overdueInvoices > 1 ? 'dépassées' : 'dépassée'}',
          channelId: 'invoices',
          channelName: 'Factures',
        );
      }

      if (expiredQuotes > 0) {
        await _show(
          id: 1002,
          title: 'Devis expirés',
          body: '$expiredQuotes devis ${expiredQuotes > 1 ? 'expirés' : 'expiré'} sans réponse',
          channelId: 'quotes',
          channelName: 'Devis',
        );
      }
    } catch (_) {}
  }

  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required String channelId,
    required String channelName,
  }) async {
    await _plugin.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          channelName,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(),
      ),
    );
  }
}
