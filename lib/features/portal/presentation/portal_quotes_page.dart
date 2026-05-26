import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../core/theme/app_theme.dart';

class PortalQuotesPage extends StatefulWidget {
  const PortalQuotesPage({super.key});

  @override
  State<PortalQuotesPage> createState() => _PortalQuotesPageState();
}

class _PortalQuotesPageState extends State<PortalQuotesPage> {
  bool _loading = true;
  List<Quote> _quotes = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) return;
      final data = await Supabase.instance.client
          .from('quotes')
          .select('id, quote_number, project_type, total, status, valid_until, created_at')
          .eq('client_id', uid)
          .order('created_at', ascending: false);
      setState(() {
        _quotes = (data as List).map((j) => Quote.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _fmtAmount(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }

  String _fmtDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso.substring(0, 10);
    }
  }

  bool _isExpired(Quote q) {
    if (q.validUntil == null) return false;
    if (q.status != QuoteStatus.sent) return false;
    return DateTime.tryParse(q.validUntil!)?.isBefore(DateTime.now()) ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes devis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Déconnexion',
            onPressed: () => Supabase.instance.client.auth.signOut(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _quotes.isEmpty
                  ? const EmptyState(
                      icon: Icons.description_outlined,
                      title: 'Aucun devis',
                      subtitle: 'Vos devis apparaîtront ici',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _quotes.length,
                      itemBuilder: (_, i) {
                        final q = _quotes[i];
                        final expired = _isExpired(q);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: expired
                                ? BorderSide(
                                    color: AppColors.amber.withValues(alpha: 0.5))
                                : BorderSide.none,
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        q.quoteNumber,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: cs.onSurfaceVariant,
                                              fontFamily: 'monospace',
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                    ),
                                    QuoteStatusBadge(status: q.status),
                                    if (expired) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.amber
                                              .withValues(alpha: 0.15),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          'EXPIRÉ',
                                          style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.amber),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (q.projectType != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    q.projectType!,
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(color: cs.onSurfaceVariant),
                                  ),
                                ],
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _fmtAmount(q.total),
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: cs.primary,
                                          ),
                                    ),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          'Créé le ${_fmtDate(q.createdAt.toIso8601String())}',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall
                                              ?.copyWith(
                                                  color: cs.onSurfaceVariant,
                                                  fontSize: 11),
                                        ),
                                        if (q.validUntil != null)
                                          Text(
                                            'Valide jusqu\'au ${_fmtDate(q.validUntil)}',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                    color: expired
                                                        ? AppColors.amber
                                                        : cs.onSurfaceVariant,
                                                    fontSize: 11),
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
