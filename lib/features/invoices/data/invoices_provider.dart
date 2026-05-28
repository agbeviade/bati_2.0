import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class InvoicesState {
  final List<Invoice> items;
  final bool loading;
  final String? error;

  const InvoicesState({
    this.items = const [],
    this.loading = true,
    this.error,
  });

  InvoicesState copyWith({List<Invoice>? items, bool? loading, String? error}) =>
      InvoicesState(
        items: items ?? this.items,
        loading: loading ?? this.loading,
        error: error,
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
// Notifier
// ---------------------------------------------------------------------------

class InvoicesNotifier extends StateNotifier<InvoicesState> {
  InvoicesNotifier() : super(const InvoicesState());

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final data = await Supabase.instance.client
          .from('invoices')
          .select()
          .order('created_at', ascending: false);
      final invoices = (data as List).map((j) => Invoice.fromJson(j as Map<String, dynamic>)).toList();
      state = InvoicesState(items: invoices, loading: false);
    } catch (e) {
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
