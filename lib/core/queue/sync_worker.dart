import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'sync_queue.dart';

/// Worker qui draine la queue d'ops en attente vers Supabase.
///
/// Trois déclencheurs :
/// 1. Au démarrage de l'app (au cas où on reprend une session avec des ops).
/// 2. Sur reconnexion réseau (via `Connectivity.onConnectivityChanged`).
/// 3. Périodique toutes les 30s tant que la queue n'est pas vide.
///
/// Chaque op a un compteur de retries. Après 5 échecs, on abandonne
/// silencieusement pour éviter de bloquer la queue avec un payload corrompu.
/// (En prod, on enverrait ces ops "mortes" à Sentry pour investigation.)
class SyncWorker {
  StreamSubscription<List<ConnectivityResult>>? _connSub;
  Timer? _periodicTimer;
  bool _draining = false;
  bool _started = false;

  /// Démarre le worker. Idempotent — peut être appelé plusieurs fois.
  void start() {
    if (_started) return;
    _started = true;

    // 1. Drain initial au boot
    drain();

    // 2. Drain à chaque reconnexion
    _connSub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) =>
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet ||
          r == ConnectivityResult.vpn);
      if (online) drain();
    });

    // 3. Retry périodique (cas où le connectivity listener rate un event)
    _periodicTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (SyncQueue.instance.length > 0) drain();
    });
  }

  /// Traite chaque op en attente. Une op qui échoue est remise en queue
  /// avec retries+1 ; après 5 échecs elle est abandonnée.
  Future<void> drain() async {
    if (_draining) return;
    _draining = true;
    try {
      final ops = SyncQueue.instance.readAll();
      for (final op in ops) {
        final ok = await _execute(op);
        if (ok) {
          await SyncQueue.instance.remove(op.id);
        } else {
          final next = op.incrementRetries();
          if (next.retries >= 5) {
            await SyncQueue.instance.remove(op.id);
          } else {
            await SyncQueue.instance.update(next);
          }
        }
      }
    } finally {
      _draining = false;
    }
  }

  /// Exécute une op selon son `kind`. Retourne `true` si succès,
  /// `false` si échec (réseau, RLS, etc.).
  Future<bool> _execute(PendingOp op) async {
    final client = Supabase.instance.client;
    try {
      switch (op.kind) {
        case 'attendance_checkin':
          await client.from('attendance').insert(op.payload);
          return true;
        case 'attendance_checkout':
          // payload contient `_attendance_id` (la ligne à mettre à jour)
          // + les champs check_out / geo_lat_out / geo_lng_out
          final id = op.payload['_attendance_id'] as String;
          final update = Map<String, dynamic>.from(op.payload)
            ..remove('_attendance_id');
          await client.from('attendance').update(update).eq('id', id);
          return true;
        default:
          // Kind inconnu → on l'enlève silencieusement (corruption ou
          // ancienne version du client)
          return true;
      }
    } catch (_) {
      return false;
    }
  }

  void dispose() {
    _connSub?.cancel();
    _periodicTimer?.cancel();
    _started = false;
  }
}

/// Instance globale du worker, démarrée dans `main.dart` après `SyncQueue.init()`.
final syncWorker = SyncWorker();
