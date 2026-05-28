import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class QuotesState {
  final List<Quote> items;
  final bool loading;
  final String? error;

  const QuotesState({
    this.items = const [],
    this.loading = true,
    this.error,
  });

  QuotesState copyWith({List<Quote>? items, bool? loading, String? error}) =>
      QuotesState(
        items: items ?? this.items,
        loading: loading ?? this.loading,
        error: error,
      );

  // Stats calculées depuis les données chargées
  double get totalApproved => items
      .where((q) => q.status == QuoteStatus.approved)
      .fold(0, (s, q) => s + q.total);

  int count(QuoteStatus s) => items.where((q) => q.status == s).length;
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

class QuotesNotifier extends StateNotifier<QuotesState> {
  QuotesNotifier() : super(const QuotesState());

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final data = await Supabase.instance.client
          .from('quotes')
          .select()
          .order('created_at', ascending: false);
      final quotes = (data as List).map((j) => Quote.fromJson(j as Map<String, dynamic>)).toList();
      state = QuotesState(items: quotes, loading: false);
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
