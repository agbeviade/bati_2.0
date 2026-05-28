import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/json_cache.dart';
import '../../../shared/models/models.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class QuotesState {
  final List<Quote> items;
  final bool loading;
  final String? error;
  final DateTime? lastSyncedAt;

  const QuotesState({
    this.items = const [],
    this.loading = true,
    this.error,
    this.lastSyncedAt,
  });

  QuotesState copyWith({
    List<Quote>? items,
    bool? loading,
    String? error,
    DateTime? lastSyncedAt,
  }) =>
      QuotesState(
        items: items ?? this.items,
        loading: loading ?? this.loading,
        error: error,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      );

  // Stats calculées depuis les données chargées
  double get totalApproved => items
      .where((q) => q.status == QuoteStatus.approved)
      .fold(0, (s, q) => s + q.total);

  int count(QuoteStatus s) => items.where((q) => q.status == s).length;
}

// ---------------------------------------------------------------------------
// Notifier — stale-while-revalidate
// ---------------------------------------------------------------------------

class QuotesNotifier extends StateNotifier<QuotesState> {
  static const _cacheKey = 'quotes_v1';

  QuotesNotifier() : super(const QuotesState()) {
    _hydrateFromCache();
  }

  void _hydrateFromCache() {
    final entry = JsonCache.instance.read(_cacheKey);
    if (entry == null) return;
    try {
      final list = (entry.data as List).cast<Map<String, dynamic>>();
      final items = list.map(Quote.fromJson).toList();
      state = QuotesState(items: items, loading: false, lastSyncedAt: entry.savedAt);
    } catch (_) {}
  }

  Future<void> load() async {
    if (state.items.isEmpty) {
      state = state.copyWith(loading: true, error: null);
    }
    try {
      final data = await Supabase.instance.client
          .from('quotes')
          .select()
          .order('created_at', ascending: false);
      final jsonList = (data as List).cast<Map<String, dynamic>>();
      await JsonCache.instance.write(_cacheKey, jsonList);
      final quotes = jsonList.map(Quote.fromJson).toList();
      state = QuotesState(items: quotes, loading: false, lastSyncedAt: DateTime.now());
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final quotesProvider = StateNotifierProvider<QuotesNotifier, QuotesState>(
  (ref) => QuotesNotifier(),
);
