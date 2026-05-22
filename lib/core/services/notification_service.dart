import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    _initialized = true;
  }

  Future<void> show(int id, String title, String body, {String? payload}) async {
    const android = AndroidNotificationDetails(
      'batiflow_alerts',
      'Alertes BatiFlow',
      channelDescription: 'Alertes chantiers, factures et stock',
      importance: Importance.high,
      priority: Priority.high,
    );
    const ios = DarwinNotificationDetails();
    await _plugin.show(id, title, body, const NotificationDetails(android: android, iOS: ios), payload: payload);
  }

  /// Vérifie les alertes et affiche une notification pour chacune.
  Future<void> checkAndNotify() async {
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) return;

    try {
      final now = DateTime.now().toIso8601String();
      final monthStart = DateTime.now().subtract(const Duration(days: 1)).toIso8601String();

      final results = await Future.wait<dynamic>([
        // Factures en retard
        client.from('invoices').select('id').inFilter('status', ['sent', 'overdue']).lt('due_date', now),
        // Devis expirés (valides hier et statut sent)
        client.from('quotes').select('id').eq('status', 'sent').lt('valid_until', now),
        // Matériaux en stock faible
        client.from('materials').select('id, name, stock_qty, min_stock_qty').gt('min_stock_qty', 0),
        // Pointages ouverts depuis plus de 12h
        client.from('attendance').select('id').is_('check_out', null).lt('check_in', monthStart),
      ]);

      int notifId = 100;

      final overdueInvoices = (results[0] as List).length;
      if (overdueInvoices > 0) {
        await show(notifId++, 'Factures en retard',
            '$overdueInvoices facture${overdueInvoices > 1 ? 's' : ''} en attente de paiement',
            payload: '/invoices');
      }

      final expiredQuotes = (results[1] as List).length;
      if (expiredQuotes > 0) {
        await show(notifId++, 'Devis expirés',
            '$expiredQuotes devis ont dépassé leur date de validité',
            payload: '/quotes');
      }

      final materials = results[2] as List;
      final lowStock = materials.where((m) {
        final stock = (m['stock_qty'] as num?)?.toDouble() ?? 0;
        final min = (m['min_stock_qty'] as num?)?.toDouble() ?? 0;
        return min > 0 && stock <= min;
      }).toList();
      if (lowStock.isNotEmpty) {
        final name = lowStock.first['name'] as String;
        final extra = lowStock.length > 1 ? ' et ${lowStock.length - 1} autre${lowStock.length > 2 ? 's' : ''}' : '';
        await show(notifId++, 'Stock faible', '$name$extra en dessous du seuil minimum', payload: '/materials');
      }

      final openAttendance = (results[3] as List).length;
      if (openAttendance > 0) {
        await show(notifId++, 'Pointage ouvert',
            '$openAttendance pointage${openAttendance > 1 ? 's' : ''} ouvert${openAttendance > 1 ? 's' : ''} depuis plus de 24h',
            payload: '/attendance');
      }
    } catch (_) {
      // Silencieux — l'app fonctionne même sans notifications
    }
  }
}
