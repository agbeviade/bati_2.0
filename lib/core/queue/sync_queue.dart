import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Opération d'écriture en attente, persistée dans SharedPreferences.
///
/// Chaque op a un `kind` (string discriminant) qui dit au worker
/// comment l'exécuter. Le `payload` est la map JSON à envoyer à Supabase.
class PendingOp {
  final String id; // identifiant local unique
  final String kind;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int retries;

  const PendingOp({
    required this.id,
    required this.kind,
    required this.payload,
    required this.createdAt,
    this.retries = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind,
        'payload': payload,
        'createdAt': createdAt.toIso8601String(),
        'retries': retries,
      };

  factory PendingOp.fromJson(Map<String, dynamic> j) => PendingOp(
        id: j['id'] as String,
        kind: j['kind'] as String,
        payload: Map<String, dynamic>.from(j['payload'] as Map),
        createdAt: DateTime.parse(j['createdAt'] as String),
        retries: (j['retries'] as int?) ?? 0,
      );

  PendingOp incrementRetries() => PendingOp(
        id: id,
        kind: kind,
        payload: payload,
        createdAt: createdAt,
        retries: retries + 1,
      );
}

/// Queue persistante d'opérations en attente.
///
/// V1 sur SharedPreferences — convient pour < 100 ops/jour par utilisateur.
/// Pour des volumes plus gros, migrer vers `drift` / `sqflite`.
class SyncQueue {
  static const _key = 'sync_queue_v1';
  final SharedPreferences _prefs;

  SyncQueue._(this._prefs);

  static SyncQueue? _instance;
  static SyncQueue get instance {
    final i = _instance;
    if (i == null) {
      throw StateError('SyncQueue non initialisé — appeler SyncQueue.init() dans main.dart');
    }
    return i;
  }

  static Future<SyncQueue> init() async {
    final prefs = await SharedPreferences.getInstance();
    return _instance = SyncQueue._(prefs);
  }

  List<PendingOp> readAll() {
    final raw = _prefs.getString(_key);
    if (raw == null) return [];
    try {
      final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
      return list.map(PendingOp.fromJson).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _writeAll(List<PendingOp> ops) async {
    await _prefs.setString(_key, jsonEncode(ops.map((o) => o.toJson()).toList()));
  }

  Future<void> enqueue(PendingOp op) async {
    final all = readAll();
    all.add(op);
    await _writeAll(all);
  }

  Future<void> remove(String id) async {
    final all = readAll().where((o) => o.id != id).toList();
    await _writeAll(all);
  }

  Future<void> update(PendingOp op) async {
    final all = readAll();
    final idx = all.indexWhere((o) => o.id == op.id);
    if (idx < 0) return;
    all[idx] = op;
    await _writeAll(all);
  }

  int get length => readAll().length;

  List<PendingOp> byKind(String kind) =>
      readAll().where((o) => o.kind == kind).toList();
}
