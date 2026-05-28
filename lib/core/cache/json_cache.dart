import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Cache JSON KV avec timestamp, basé sur SharedPreferences.
///
/// Usage typique (pattern stale-while-revalidate) :
/// ```dart
/// // 1. Au mount : lecture synchrone du cache, affichage immédiat si présent
/// final cached = JsonCache.instance.read('dashboard_kpis');
/// if (cached != null) setState(() => _data = cached.data);
///
/// // 2. En parallèle : fetch fresh
/// try {
///   final fresh = await supabase.rpc('get_dashboard_kpis');
///   await JsonCache.instance.write('dashboard_kpis', fresh);
///   setState(() => _data = fresh);
/// } catch (_) {
///   // Hors ligne : on garde les données du cache déjà affichées
/// }
/// ```
///
/// V1 : simple KV via SharedPreferences. Pour des datasets plus gros ou
/// des requêtes structurées (where, joins), migrer vers `drift` ou `sqflite`.
class JsonCache {
  static const _prefix = 'cache_v1_';
  static const _tsSuffix = '_ts';
  final SharedPreferences _prefs;

  JsonCache._(this._prefs);

  static JsonCache? _instance;
  static JsonCache get instance {
    final i = _instance;
    if (i == null) {
      throw StateError('JsonCache non initialisé — appeler JsonCache.init() dans main.dart');
    }
    return i;
  }

  static Future<JsonCache> init() async {
    final prefs = await SharedPreferences.getInstance();
    return _instance = JsonCache._(prefs);
  }

  /// Lit une entrée. Retourne `null` si absente.
  /// Retourne l'entrée même si "périmée" — c'est au caller de décider quoi
  /// faire avec un cache vieux (afficher avec un indicateur, ou ignorer).
  CacheEntry? read(String key) {
    final raw = _prefs.getString('$_prefix$key');
    if (raw == null) return null;
    try {
      final data = jsonDecode(raw);
      final tsMs = _prefs.getInt('$_prefix$key$_tsSuffix') ?? 0;
      return CacheEntry(data: data, savedAt: DateTime.fromMillisecondsSinceEpoch(tsMs));
    } catch (_) {
      return null;
    }
  }

  /// Écrit l'entrée. `data` doit être JSON-encodable (Map/List/primitives).
  Future<void> write(String key, Object data) async {
    await _prefs.setString('$_prefix$key', jsonEncode(data));
    await _prefs.setInt('$_prefix$key$_tsSuffix', DateTime.now().millisecondsSinceEpoch);
  }

  /// Supprime une entrée.
  Future<void> remove(String key) async {
    await _prefs.remove('$_prefix$key');
    await _prefs.remove('$_prefix$key$_tsSuffix');
  }

  /// Vide tout le cache (utile au logout).
  Future<void> clear() async {
    final keys = _prefs.getKeys().where((k) => k.startsWith(_prefix));
    for (final k in keys) {
      await _prefs.remove(k);
    }
  }
}

class CacheEntry {
  final dynamic data;
  final DateTime savedAt;
  const CacheEntry({required this.data, required this.savedAt});

  Duration get age => DateTime.now().difference(savedAt);
  bool isStale(Duration maxAge) => age > maxAge;
}
