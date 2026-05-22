import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/empty_state.dart';

class QuotesPage extends StatefulWidget {
  const QuotesPage({super.key});

  @override
  State<QuotesPage> createState() => _QuotesPageState();
}

class _QuotesPageState extends State<QuotesPage> {
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
      final data = await Supabase.instance.client
          .from('quotes')
          .select()
          .order('created_at', ascending: false);
      setState(() {
        _quotes = (data as List).map((j) => Quote.fromJson(j)).toList();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Devis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome),
            tooltip: 'Devis IA',
            onPressed: () => context.go('/quotes/ai'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _quotes.isEmpty
                  ? const EmptyState(icon: Icons.description_outlined, title: 'Aucun devis', subtitle: 'Créez vos devis depuis la version web')
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _quotes.length,
                      itemBuilder: (_, i) => _QuoteTile(quote: _quotes[i]),
                    ),
            ),
    );
  }
}

class _QuoteTile extends StatelessWidget {
  final Quote quote;
  const _QuoteTile({required this.quote});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final q = quote;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/quotes/${q.id}'),
        child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(q.quoteNumber, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant, fontFamily: 'monospace'))),
                QuoteStatusBadge(status: q.status),
              ],
            ),
            const SizedBox(height: 4),
            if (q.clientName != null)
              Text(q.clientName!, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
            if (q.projectType != null) ...[
              const SizedBox(height: 2),
              Text(q.projectType!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            ],
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(_fmt(q.total), style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: cs.primary)),
                if (q.validUntil != null)
                  Text('Valide jusqu\'au ${q.validUntil}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
              ],
            ),
          ],
        ),
      ),
      ),
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M XOF';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K XOF';
    return '${v.toStringAsFixed(0)} XOF';
  }
}
