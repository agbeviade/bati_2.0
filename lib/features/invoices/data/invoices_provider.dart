import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/cache/json_cache.dart';
import '../../../shared/models/models.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class InvoicesState {
  final List<Invoice> items;
  final bool loading;
  final String? error;
  final DateTime? lastSyncedAt;

  const InvoicesState({
    this.items = const [],
    this.loading = true,
    this.error,
    this.lastSyncedAt,
  });

  InvoicesState copyWith({
    List<Invoice>? items,
    bool? loading,
    String? error,
    DateTime? lastSyncedAt,
  }) =>
      InvoicesState(
        items: items ?? this.items,
        loading: loading ?? this.loading,
        error: error,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      );

  // Stats calculées depuis les données chargées
  int get countDraft    => items.where((i) => i.status == InvoiceStatus.draft).length;
  int get countSent     => items.where((i) => i.status == InvoiceStatus.sent).length;
  int get countPaid     => items.where((i) => i.status == InvoiceStatus.paid).length;
  int get countOverdue  => items.where((i) => i.isOverdue).length;
  double get totalAmount => items.fold(0, (s, i) => s + i.amount);
  double get paidAmount  => items.where((i) => i.status == InvoiceStatus.paid).fold(0, (s, i) => s + i.amount);
}

// ---------------------------------------------------------------------------
// Notifier — stale-while-revalidate
// ---------------------------------------------------------------------------

class InvoicesNotifier extends StateNotifier<InvoicesState> {
  static const _cacheKey = 'invoices_v1';

  InvoicesNotifier() : super(const InvoicesState()) {
    _hydrateFromCache();
  }

  /// Lecture synchrone du cache au boot du notifier — l'UI voit
  /// immédiatement les anciennes données dès la 2e ouverture.
  void _hydrateFromCache() {
    final entry = JsonCache.instance.read(_cacheKey);
    if (entry == null) return;
    try {
      final list = (entry.data as List).cast<Map<String, dynamic>>();
      final items = list.map(Invoice.fromJson).toList();
      state = InvoicesState(items: items, loading: false, lastSyncedAt: entry.savedAt);
    } catch (_) {
      // Cache corrompu — on l'ignore, load() refetchera tout
    }
  }

  /// Fetch fresh depuis Supabase. Garde les items affichés en cas d'échec
  /// réseau (mode hors-ligne, l'utilisateur continue à voir le cache).
  Future<void> load() async {
    // Ne flag loading=true que si on n'a rien à afficher
    if (state.items.isEmpty) {
      state = state.copyWith(loading: true, error: null);
    }
    try {
      final data = await Supabase.instance.client
          .from('invoices')
          .select()
          .order('created_at', ascending: false);
      final jsonList = (data as List).cast<Map<String, dynamic>>();
      await JsonCache.instance.write(_cacheKey, jsonList);
      final invoices = jsonList.map(Invoice.fromJson).toList();
      state = InvoicesState(items: invoices, loading: false, lastSyncedAt: DateTime.now());
    } catch (e) {
      // Hors ligne ou erreur — on garde les items du cache
      state = state.copyWith(loading: false, error: e.toString());
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final invoicesProvider = StateNotifierProvider<InvoicesNotifier, InvoicesState>(
  (ref) => InvoicesNotifier(),
);
