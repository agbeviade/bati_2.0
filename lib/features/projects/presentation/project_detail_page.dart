import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../shared/models/models.dart' as models;
import '../../../shared/widgets/status_badge.dart';
import '../../../core/theme/app_theme.dart';

// ── Inline data models ────────────────────────────────────────

class _Movement {
  final String id;
  final String materialId;
  final String type;
  final double quantity;
  final double? unitCost;
  final String? notes;
  final DateTime createdAt;
  final String materialName;
  final String unit;

  _Movement({
    required this.id,
    required this.materialId,
    required this.type,
    required this.quantity,
    this.unitCost,
    this.notes,
    required this.createdAt,
    required this.materialName,
    required this.unit,
  });
}

class _Expense {
  final String id;
  final String label;
  final double amount;
  final String? category;
  final String? spentAt;
  final String? notes;

  _Expense({
    required this.id,
    required this.label,
    required this.amount,
    this.category,
    this.spentAt,
    this.notes,
  });
}

class _PhotoItem {
  final String id;
  final String path;
  final String? caption;
  final String signedUrl;
  _PhotoItem({required this.id, required this.path, this.caption, required this.signedUrl});
}

class _Member {
  final String assignmentId;
  final String userId;
  final String? roleOnProject;
  final String? fullName;
  final String? role;

  _Member({
    required this.assignmentId,
    required this.userId,
    this.roleOnProject,
    this.fullName,
    this.role,
  });

  String get initials {
    if (fullName == null || fullName!.isEmpty) return '?';
    return fullName!.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase();
  }
}

// ── Main Page ─────────────────────────────────────────────────

class ProjectDetailPage extends StatefulWidget {
  final String id;
  const ProjectDetailPage({super.key, required this.id});

  @override
  State<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends State<ProjectDetailPage> with TickerProviderStateMixin {
  late final TabController _tabCtrl;

  // Base data (tab 0 — always loaded on init)
  bool _loading = true;
  models.Project? _project;
  String _currency = 'XOF';
  List<Map<String, dynamic>> _tasks = [];

  // Tab 1 — Matériaux
  bool _matLoaded = false;
  bool _matLoading = false;
  List<_Movement> _movements = [];
  List<models.Material> _allMaterials = [];

  // Tab 2 — Dépenses
  bool _expLoaded = false;
  bool _expLoading = false;
  List<_Expense> _expenses = [];

  // Tab 3 — Photos
  bool _photoLoaded = false;
  bool _photoLoading = false;
  List<_PhotoItem> _photos = [];

  // Tab 4 — Équipe
  bool _teamLoaded = false;
  bool _teamLoading = false;
  List<_Member> _members = [];
  List<models.AppUser> _availableUsers = [];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 5, vsync: this);
    _tabCtrl.addListener(_onTabChanged);
    _loadBase();
  }

  @override
  void dispose() {
    _tabCtrl.removeListener(_onTabChanged);
    _tabCtrl.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabCtrl.indexIsChanging) return;
    switch (_tabCtrl.index) {
      case 1: if (!_matLoaded) _loadMaterials(); break;
      case 2: if (!_expLoaded) _loadExpenses(); break;
      case 3: if (!_photoLoaded) _loadPhotos(); break;
      case 4: if (!_teamLoaded) _loadTeam(); break;
    }
  }

  // ── Data loaders ─────────────────────────────────────────────

  Future<void> _loadBase() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait<dynamic>([
        client.from('projects').select().eq('id', widget.id).single(),
        client.from('tasks').select('id, title, status, priority, due_date').eq('project_id', widget.id).order('created_at', ascending: false),
      ]);
      final proj = models.Project.fromJson(results[0] as Map<String, dynamic>);
      // Fetch company currency
      final compData = await client.from('companies').select('currency').eq('id', proj.companyId).maybeSingle();
      setState(() {
        _project = proj;
        _currency = (compData)?['currency'] as String? ?? 'XOF';
        _tasks = (results[1] as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _reloadTasks() async {
    final data = await Supabase.instance.client
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('project_id', widget.id)
        .order('created_at', ascending: false);
    setState(() => _tasks = (data as List).cast<Map<String, dynamic>>());
  }

  Future<void> _loadMaterials() async {
    if (_project == null) return;
    setState(() { _matLoaded = true; _matLoading = true; });
    try {
      final client = Supabase.instance.client;
      final results = await Future.wait<dynamic>([
        client
            .from('stock_movements')
            .select('id, material_id, type, quantity, unit_cost, notes, created_at, materials(name, unit)')
            .eq('project_id', widget.id)
            .inFilter('type', ['use', 'return'])
            .order('created_at', ascending: false),
        client
            .from('materials')
            .select('id, name, unit, stock_qty, unit_cost')
            .eq('company_id', _project!.companyId)
            .order('name'),
      ]);

      final movRows = (results[0] as List).cast<Map<String, dynamic>>();
      setState(() {
        _movements = movRows.map((m) {
          final mat = m['materials'] as Map<String, dynamic>?;
          return _Movement(
            id: m['id'] as String,
            materialId: m['material_id'] as String,
            type: m['type'] as String,
            quantity: (m['quantity'] as num).toDouble(),
            unitCost: (m['unit_cost'] as num?)?.toDouble(),
            notes: m['notes'] as String?,
            createdAt: DateTime.parse(m['created_at'] as String),
            materialName: mat?['name'] as String? ?? 'Matériau inconnu',
            unit: mat?['unit'] as String? ?? 'u',
          );
        }).toList();
        _allMaterials = (results[1] as List)
            .map((r) => models.Material.fromJson(r as Map<String, dynamic>))
            .toList();
        _matLoading = false;
      });
    } catch (_) {
      setState(() => _matLoading = false);
    }
  }

  Future<void> _loadExpenses() async {
    setState(() { _expLoaded = true; _expLoading = true; });
    try {
      final data = await Supabase.instance.client
          .from('project_expenses')
          .select('id, label, amount, category, spent_at, notes')
          .eq('project_id', widget.id)
          .order('spent_at', ascending: false);
      setState(() {
        _expenses = (data as List).cast<Map<String, dynamic>>().map((e) => _Expense(
          id: e['id'] as String,
          label: e['label'] as String,
          amount: (e['amount'] as num).toDouble(),
          category: e['category'] as String?,
          spentAt: e['spent_at'] as String?,
          notes: e['notes'] as String?,
        )).toList();
        _expLoading = false;
      });
    } catch (_) {
      setState(() => _expLoading = false);
    }
  }

  Future<void> _loadPhotos() async {
    setState(() { _photoLoaded = true; _photoLoading = true; });
    try {
      final client = Supabase.instance.client;
      final data = await client
          .from('project_photos')
          .select('id, storage_path, caption, taken_at')
          .eq('project_id', widget.id)
          .order('taken_at', ascending: false);
      final rows = (data as List).cast<Map<String, dynamic>>();
      List<_PhotoItem> photos = [];
      if (rows.isNotEmpty) {
        final paths = rows.map((p) => p['storage_path'] as String).toList();
        try {
          final signed = await client.storage.from('project-photos').createSignedUrls(paths, 3600);
          for (int i = 0; i < rows.length; i++) {
            photos.add(_PhotoItem(
              id: rows[i]['id'] as String,
              path: rows[i]['storage_path'] as String,
              caption: rows[i]['caption'] as String?,
              signedUrl: i < signed.length ? signed[i].signedUrl : '',
            ));
          }
        } catch (_) {
          photos = rows.map((p) => _PhotoItem(
            id: p['id'] as String,
            path: p['storage_path'] as String,
            caption: p['caption'] as String?,
            signedUrl: '',
          )).toList();
        }
      }
      setState(() { _photos = photos; _photoLoading = false; });
    } catch (_) {
      setState(() => _photoLoading = false);
    }
  }

  Future<void> _loadTeam() async {
    if (_project == null) return;
    setState(() { _teamLoaded = true; _teamLoading = true; });
    try {
      final client = Supabase.instance.client;
      final assignData = await client
          .from('project_assignments')
          .select('id, user_id, role_on_project')
          .eq('project_id', widget.id);
      final assignRows = (assignData as List).cast<Map<String, dynamic>>();
      final assignedIds = assignRows.map((a) => a['user_id'] as String).toList();

      List<_Member> members = [];
      if (assignedIds.isNotEmpty) {
        final usersData = await client
            .from('users')
            .select('id, full_name, role')
            .inFilter('id', assignedIds);
        final usersMap = <String, Map<String, dynamic>>{
          for (final u in (usersData as List).cast<Map<String, dynamic>>()) u['id'] as String: u
        };
        members = assignRows.map((a) {
          final u = usersMap[a['user_id'] as String];
          return _Member(
            assignmentId: a['id'] as String,
            userId: a['user_id'] as String,
            roleOnProject: a['role_on_project'] as String?,
            fullName: u?['full_name'] as String?,
            role: u?['role'] as String?,
          );
        }).toList();
      }

      final allUsersData = await client
          .from('users')
          .select('id, full_name, role, specialty, daily_rate, is_active, company_id')
          .eq('company_id', _project!.companyId)
          .eq('is_active', true);
      final available = (allUsersData as List)
          .cast<Map<String, dynamic>>()
          .map((u) => models.AppUser.fromJson(u))
          .where((u) => !assignedIds.contains(u.id))
          .toList();

      setState(() { _members = members; _availableUsers = available; _teamLoading = false; });
    } catch (_) {
      setState(() => _teamLoading = false);
    }
  }

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_project == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Chantier introuvable')));
    }
    final p = _project!;
    return Scaffold(
      appBar: AppBar(
        title: Text(p.name, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () async {
              final updated = await context.push('/projects/${p.id}/edit', extra: p);
              if (updated == true) _loadBase();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Général'),
            Tab(text: 'Matériaux'),
            Tab(text: 'Dépenses'),
            Tab(text: 'Photos'),
            Tab(text: 'Équipe'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _GeneralTab(project: p, tasks: _tasks, currency: _currency, onRefreshTasks: _reloadTasks),
          _MaterialsTab(
            projectId: widget.id,
            companyId: p.companyId,
            currency: _currency,
            movements: _movements,
            allMaterials: _allMaterials,
            loading: _matLoading,
            onReload: _loadMaterials,
          ),
          _ExpensesTab(
            projectId: widget.id,
            currency: _currency,
            expenses: _expenses,
            loading: _expLoading,
            onReload: _loadExpenses,
          ),
          _PhotosTab(
            projectId: widget.id,
            photos: _photos,
            loading: _photoLoading,
            onReload: _loadPhotos,
          ),
          _TeamTab(
            projectId: widget.id,
            members: _members,
            availableUsers: _availableUsers,
            loading: _teamLoading,
            onReload: _loadTeam,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Tab 0 — Général
// ─────────────────────────────────────────────────────────────

class _GeneralTab extends StatelessWidget {
  final models.Project project;
  final List<Map<String, dynamic>> tasks;
  final String currency;
  final Future<void> Function() onRefreshTasks;

  const _GeneralTab({
    required this.project,
    required this.tasks,
    required this.currency,
    required this.onRefreshTasks,
  });

  @override
  Widget build(BuildContext context) {
    final p = project;
    final cs = Theme.of(context).colorScheme;
    final doneTasks = tasks.where((t) => t['status'] == 'done').length;

    Color progressColor = AppColors.primary;
    if (p.progressPct < 30) progressColor = AppColors.red;
    else if (p.progressPct < 70) progressColor = const Color(0xFFF59E0B);

    return RefreshIndicator(
      onRefresh: onRefreshTasks,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status + progress
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text('Statut', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant))),
                      ProjectStatusBadge(status: p.status),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: p.progressPct / 100,
                            backgroundColor: const Color(0xFFE2E8F0),
                            color: progressColor,
                            minHeight: 8,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text('${p.progressPct}%', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const Divider(height: 20),
                  if (p.address != null) _InfoRow(icon: Icons.location_on_outlined, label: 'Adresse', value: p.address!),
                  if (p.startDate != null) _InfoRow(icon: Icons.calendar_today_outlined, label: 'Début', value: _fmtDate(p.startDate!)),
                  if (p.endDate != null) _InfoRow(icon: Icons.event_outlined, label: 'Fin prévue', value: _fmtDate(p.endDate!)),
                  if (p.description != null) ...[
                    const Divider(height: 20),
                    Text(p.description!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                  ],
                ],
              ),
            ),
          ),

          // Budget
          if (p.budget != null) ...[
            const SizedBox(height: 12),
            _BudgetCard(budget: p.budget!, spent: p.spent, currency: currency),
          ],

          // Tâches
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _TasksSection(tasks: tasks, projectId: p.id, onRefresh: onRefreshTasks),
            ),
          ),

          // KPI mini row
          const SizedBox(height: 12),
          Row(children: [
            _MiniKpi(label: 'Tâches', value: '${tasks.length}', icon: Icons.task_alt_outlined, color: AppColors.primary),
            const SizedBox(width: 8),
            _MiniKpi(label: 'Terminées', value: '$doneTasks', icon: Icons.check_circle_outline, color: AppColors.green),
          ]),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _fmtDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso;
    }
  }
}

class _MiniKpi extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _MiniKpi({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 16)),
            Text(label, style: TextStyle(fontSize: 11, color: color.withValues(alpha: 0.7))),
          ]),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Tab 1 — Matériaux
// ─────────────────────────────────────────────────────────────

class _MaterialsTab extends StatefulWidget {
  final String projectId;
  final String companyId;
  final String currency;
  final List<_Movement> movements;
  final List<models.Material> allMaterials;
  final bool loading;
  final Future<void> Function() onReload;

  const _MaterialsTab({
    required this.projectId,
    required this.companyId,
    required this.currency,
    required this.movements,
    required this.allMaterials,
    required this.loading,
    required this.onReload,
  });

  @override
  State<_MaterialsTab> createState() => _MaterialsTabState();
}

class _MaterialsTabState extends State<_MaterialsTab> {
  bool _showForm = false;
  bool _saving = false;
  String _selectedMatId = '';
  String _selectedType = 'use';
  final _qtyCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.allMaterials.isNotEmpty) _selectedMatId = widget.allMaterials.first.id;
  }

  @override
  void didUpdateWidget(_MaterialsTab old) {
    super.didUpdateWidget(old);
    if (old.allMaterials.isEmpty && widget.allMaterials.isNotEmpty) {
      _selectedMatId = widget.allMaterials.first.id;
    }
  }

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _costCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final qty = double.tryParse(_qtyCtrl.text.replaceAll(',', '.'));
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quantité invalide')));
      return;
    }
    if (_selectedMatId.isEmpty) return;
    setState(() => _saving = true);
    try {
      final mat = widget.allMaterials.firstWhere((m) => m.id == _selectedMatId);
      final cost = double.tryParse(_costCtrl.text.replaceAll(',', '.')) ?? mat.unitCost;
      await Supabase.instance.client.from('stock_movements').insert({
        'material_id': _selectedMatId,
        'project_id': widget.projectId,
        'company_id': widget.companyId,
        'type': _selectedType,
        'quantity': qty,
        'unit_cost': cost > 0 ? cost : null,
        'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      });
      _qtyCtrl.clear();
      _costCtrl.clear();
      _notesCtrl.clear();
      setState(() { _showForm = false; _saving = false; });
      widget.onReload();
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _delete(_Movement m) async {
    try {
      await Supabase.instance.client.from('stock_movements').delete().eq('id', m.id);
      widget.onReload();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) return const Center(child: CircularProgressIndicator());

    // Summary by material
    final summary = <String, Map<String, dynamic>>{};
    for (final m in widget.movements) {
      summary.putIfAbsent(m.materialId, () => {
        'name': m.materialName, 'unit': m.unit, 'used': 0.0, 'returned': 0.0, 'cost': 0.0,
      });
      if (m.type == 'use') {
        summary[m.materialId]!['used'] = (summary[m.materialId]!['used'] as double) + m.quantity;
        summary[m.materialId]!['cost'] = (summary[m.materialId]!['cost'] as double) + m.quantity * (m.unitCost ?? 0);
      } else {
        summary[m.materialId]!['returned'] = (summary[m.materialId]!['returned'] as double) + m.quantity;
      }
    }
    final summaryList = summary.values.toList()..sort((a, b) => (b['cost'] as double).compareTo(a['cost'] as double));
    final totalCost = summaryList.fold(0.0, (s, r) => s + (r['cost'] as double));

    final selectedMat = widget.allMaterials.isNotEmpty
        ? widget.allMaterials.firstWhere((m) => m.id == _selectedMatId, orElse: () => widget.allMaterials.first)
        : null;

    return RefreshIndicator(
      onRefresh: widget.onReload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Résumé
          if (summaryList.isNotEmpty) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Récapitulatif', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                        Text('${_fmtNum(totalCost)} ${ widget.currency}', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...summaryList.map((row) {
                      final net = (row['used'] as double) - (row['returned'] as double);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(children: [
                          Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                            child: Icon(Icons.inventory_2_outlined, size: 16, color: AppColors.primary),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(row['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                            Text(
                              '${_fmtNum(row['used'] as double)} ${row['unit']} sorti'
                              '${(row['returned'] as double) > 0 ? ' · ${_fmtNum(row['returned'] as double)} retourné' : ''}'
                              ' · net: ${_fmtNum(net)} ${row['unit']}',
                              style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                            ),
                          ])),
                          Text('${_fmtNum(row['cost'] as double)} ${widget.currency}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ]),
                      );
                    }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Bouton + formulaire
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Sorties & retours', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      FilledButton.icon(
                        onPressed: widget.allMaterials.isEmpty ? null : () => setState(() => _showForm = !_showForm),
                        icon: Icon(_showForm ? Icons.close : Icons.add, size: 16),
                        label: const Text('Enregistrer'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          textStyle: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),

                  if (widget.allMaterials.isEmpty) ...[
                    const SizedBox(height: 16),
                    Center(child: Column(children: [
                      Icon(Icons.inventory_2_outlined, size: 36, color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4)),
                      const SizedBox(height: 8),
                      const Text('Aucun matériau dans le catalogue', style: TextStyle(fontSize: 13)),
                      const SizedBox(height: 4),
                      Text('Ajoutez d\'abord des matériaux dans le module Matériaux.',
                          style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
                    ])),
                  ],

                  if (_showForm) ...[
                    const SizedBox(height: 16),
                    _FormField(label: 'Matériau *', child: DropdownButtonFormField<String>(
                      value: _selectedMatId.isEmpty ? null : _selectedMatId,
                      decoration: _inputDeco(),
                      items: widget.allMaterials.map((m) => DropdownMenuItem<String>(
                        value: m.id,
                        child: Text('${m.name} — stock: ${_fmtNum(m.stockQty)} ${m.unit}', overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: (v) => setState(() => _selectedMatId = v ?? ''),
                    )),
                    if (selectedMat != null && selectedMat.stockQty <= 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text('⚠ Stock épuisé', style: TextStyle(fontSize: 11, color: AppColors.red)),
                      ),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: _FormField(label: 'Type *', child: DropdownButtonFormField<String>(
                        value: _selectedType,
                        decoration: _inputDeco(),
                        items: const [
                          DropdownMenuItem(value: 'use', child: Text('Sortie chantier')),
                          DropdownMenuItem(value: 'return', child: Text('Retour stock')),
                        ],
                        onChanged: (v) => setState(() => _selectedType = v ?? 'use'),
                      ))),
                      const SizedBox(width: 10),
                      Expanded(child: _FormField(
                        label: 'Quantité (${selectedMat?.unit ?? 'u'}) *',
                        child: TextFormField(controller: _qtyCtrl, decoration: _inputDeco(), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                      )),
                    ]),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: _FormField(
                        label: 'Prix unitaire',
                        child: TextFormField(
                          controller: _costCtrl,
                          decoration: _inputDeco(hint: selectedMat != null ? '${selectedMat.unitCost}' : ''),
                          keyboardType: TextInputType.number,
                        ),
                      )),
                      const SizedBox(width: 10),
                      Expanded(child: _FormField(
                        label: 'Notes',
                        child: TextFormField(controller: _notesCtrl, decoration: _inputDeco(hint: 'Bon de livraison...')),
                      )),
                    ]),
                    const SizedBox(height: 14),
                    Row(children: [
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: Text(_saving ? 'Enregistrement...' : 'Enregistrer'),
                      ),
                      const SizedBox(width: 8),
                      TextButton(onPressed: () => setState(() => _showForm = false), child: const Text('Annuler')),
                    ]),
                  ],

                  if (widget.movements.isEmpty && !_showForm) ...[
                    const SizedBox(height: 24),
                    Center(child: Text('Aucun mouvement enregistré sur ce chantier.',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13))),
                    const SizedBox(height: 8),
                  ] else if (widget.movements.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    ...widget.movements.asMap().entries.map((entry) {
                      final i = entry.key;
                      final m = entry.value;
                      final isUse = m.type == 'use';
                      return Column(children: [
                        if (i > 0) const Divider(height: 1),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(
                              color: (isUse ? AppColors.red : AppColors.primary).withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isUse ? Icons.arrow_upward : Icons.replay,
                              size: 16,
                              color: isUse ? AppColors.red : AppColors.primary,
                            ),
                          ),
                          title: Text(m.materialName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                          subtitle: Text(
                            '${isUse ? '−' : '+'}${_fmtNum(m.quantity)} ${m.unit}'
                            '${m.unitCost != null ? ' · ${_fmtNum(m.quantity * m.unitCost!)} ${widget.currency}' : ''}'
                            ' · ${_fmtShortDate(m.createdAt)}'
                            '${m.notes != null ? ' · ${m.notes}' : ''}',
                            style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: (isUse ? AppColors.red : AppColors.primary).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                isUse ? 'Sortie' : 'Retour',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: isUse ? AppColors.red : AppColors.primary),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18),
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              onPressed: () => _delete(m),
                              visualDensity: VisualDensity.compact,
                            ),
                          ]),
                        ),
                      ]);
                    }),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Tab 2 — Dépenses
// ─────────────────────────────────────────────────────────────

const _kExpenseCategories = {
  'main_oeuvre': 'Main d\'œuvre',
  'materiaux': 'Matériaux',
  'transport': 'Transport',
  'equipement': 'Équipement',
  'sous_traitance': 'Sous-traitance',
  'autre': 'Autre',
};

class _ExpensesTab extends StatefulWidget {
  final String projectId;
  final String currency;
  final List<_Expense> expenses;
  final bool loading;
  final Future<void> Function() onReload;

  const _ExpensesTab({
    required this.projectId,
    required this.currency,
    required this.expenses,
    required this.loading,
    required this.onReload,
  });

  @override
  State<_ExpensesTab> createState() => _ExpensesTabState();
}

class _ExpensesTabState extends State<_ExpensesTab> {
  bool _showForm = false;
  bool _saving = false;
  String _selectedCategory = 'autre';
  final _labelCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  DateTime _spentAt = DateTime.now();

  @override
  void dispose() {
    _labelCtrl.dispose();
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final label = _labelCtrl.text.trim();
    final amount = double.tryParse(_amountCtrl.text.replaceAll(',', '.'));
    if (label.isEmpty) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Libellé requis'))); return; }
    if (amount == null || amount <= 0) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Montant invalide'))); return; }
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('project_expenses').insert({
        'project_id': widget.projectId,
        'label': label,
        'amount': amount,
        'category': _selectedCategory,
        'spent_at': _spentAt.toIso8601String().substring(0, 10),
        'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      });
      _labelCtrl.clear();
      _amountCtrl.clear();
      _notesCtrl.clear();
      setState(() { _showForm = false; _saving = false; _spentAt = DateTime.now(); });
      widget.onReload();
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _delete(_Expense e) async {
    try {
      await Supabase.instance.client.from('project_expenses').delete().eq('id', e.id);
      widget.onReload();
    } catch (_) {}
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _spentAt,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (d != null) setState(() => _spentAt = d);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) return const Center(child: CircularProgressIndicator());

    final total = widget.expenses.fold(0.0, (s, e) => s + e.amount);

    return RefreshIndicator(
      onRefresh: widget.onReload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Total card
          if (widget.expenses.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppColors.gradientOrange,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Total dépenses', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Text('${_fmtNum(total)} ${widget.currency}',
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                ]),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                  child: const Icon(Icons.account_balance_wallet_outlined, color: Colors.white, size: 22),
                ),
              ]),
            ),
            const SizedBox(height: 12),
          ],

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Dépenses', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      FilledButton.icon(
                        onPressed: () => setState(() => _showForm = !_showForm),
                        icon: Icon(_showForm ? Icons.close : Icons.add, size: 16),
                        label: const Text('Ajouter'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          textStyle: const TextStyle(fontSize: 13),
                        ),
                      ),
                    ],
                  ),

                  if (_showForm) ...[
                    const SizedBox(height: 16),
                    _FormField(
                      label: 'Libellé *',
                      child: TextFormField(controller: _labelCtrl, decoration: _inputDeco(hint: 'Achat ciment, transport...')),
                    ),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: _FormField(
                        label: 'Montant (${widget.currency}) *',
                        child: TextFormField(controller: _amountCtrl, decoration: _inputDeco(), keyboardType: TextInputType.number),
                      )),
                      const SizedBox(width: 10),
                      Expanded(child: _FormField(label: 'Catégorie', child: DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        decoration: _inputDeco(),
                        items: _kExpenseCategories.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                        onChanged: (v) => setState(() => _selectedCategory = v ?? 'autre'),
                      ))),
                    ]),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: _FormField(
                        label: 'Date',
                        child: InkWell(
                          onTap: _pickDate,
                          child: InputDecorator(
                            decoration: _inputDeco(),
                            child: Text(
                              '${_spentAt.day.toString().padLeft(2,'0')}/${_spentAt.month.toString().padLeft(2,'0')}/${_spentAt.year}',
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        ),
                      )),
                      const SizedBox(width: 10),
                      Expanded(child: _FormField(
                        label: 'Notes',
                        child: TextFormField(controller: _notesCtrl, decoration: _inputDeco(hint: 'Optionnel...')),
                      )),
                    ]),
                    const SizedBox(height: 14),
                    Row(children: [
                      FilledButton(onPressed: _saving ? null : _save, child: Text(_saving ? 'Enregistrement...' : 'Enregistrer')),
                      const SizedBox(width: 8),
                      TextButton(onPressed: () => setState(() => _showForm = false), child: const Text('Annuler')),
                    ]),
                    const SizedBox(height: 8),
                  ],

                  if (widget.expenses.isEmpty && !_showForm) ...[
                    const SizedBox(height: 24),
                    Center(child: Text('Aucune dépense enregistrée.',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13))),
                    const SizedBox(height: 8),
                  ] else ...[
                    const SizedBox(height: 8),
                    ...widget.expenses.asMap().entries.map((entry) {
                      final i = entry.key;
                      final e = entry.value;
                      final catLabel = _kExpenseCategories[e.category] ?? e.category ?? 'Autre';
                      return Column(children: [
                        if (i > 0) const Divider(height: 1),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(color: AppColors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                            child: Icon(Icons.receipt_outlined, size: 16, color: AppColors.orange),
                          ),
                          title: Text(e.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                          subtitle: Text(
                            '$catLabel${e.spentAt != null ? ' · ${_fmtDateStr(e.spentAt!)}' : ''}${e.notes != null ? ' · ${e.notes}' : ''}',
                            style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                            Text('${_fmtNum(e.amount)} ${widget.currency}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18),
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              onPressed: () => _delete(e),
                              visualDensity: VisualDensity.compact,
                            ),
                          ]),
                        ),
                      ]);
                    }),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _fmtDateStr(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2,'0')}/${d.month.toString().padLeft(2,'0')}/${d.year}';
    } catch (_) { return iso; }
  }
}

// ─────────────────────────────────────────────────────────────
// Tab 3 — Photos
// ─────────────────────────────────────────────────────────────

class _PhotosTab extends StatefulWidget {
  final String projectId;
  final List<_PhotoItem> photos;
  final bool loading;
  final Future<void> Function() onReload;

  const _PhotosTab({
    required this.projectId,
    required this.photos,
    required this.loading,
    required this.onReload,
  });

  @override
  State<_PhotosTab> createState() => _PhotosTabState();
}

class _PhotosTabState extends State<_PhotosTab> {
  bool _uploading = false;
  final _picker = ImagePicker();

  Future<void> _pickAndUpload(ImageSource source) async {
    final file = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1920);
    if (file == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser!.id;
      final ext = file.path.split('.').last;
      final path = '${widget.projectId}/${DateTime.now().millisecondsSinceEpoch}.$ext';
      final bytes = await file.readAsBytes();
      await Supabase.instance.client.storage.from('project-photos').uploadBinary(path, bytes,
          fileOptions: FileOptions(contentType: 'image/$ext', upsert: false));
      await Supabase.instance.client.from('project_photos').insert({
        'project_id': widget.projectId,
        'storage_path': path,
        'uploaded_by': uid,
        'source': 'mobile',
      });
      widget.onReload();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur upload: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _delete(_PhotoItem photo) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Supprimer la photo'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Supabase.instance.client.storage.from('project-photos').remove([photo.path]);
      await Supabase.instance.client.from('project_photos').delete().eq('id', photo.id);
      widget.onReload();
    } catch (_) {}
  }

  void _viewPhoto(_PhotoItem photo) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            InteractiveViewer(
              child: CachedNetworkImage(imageUrl: photo.signedUrl, fit: BoxFit.contain, width: double.infinity, height: double.infinity),
            ),
            Positioned(top: 8, right: 8,
              child: IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context))),
            if (photo.caption != null)
              Positioned(bottom: 16, left: 16, right: 16,
                child: Text(photo.caption!, style: const TextStyle(color: Colors.white, shadows: [Shadow(color: Colors.black, blurRadius: 4)]))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      onRefresh: widget.onReload,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Photos (${widget.photos.length})',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  if (_uploading)
                    const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                  else
                    PopupMenuButton<ImageSource>(
                      icon: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                        child: Icon(Icons.add_a_photo_outlined, size: 20, color: AppColors.primary),
                      ),
                      itemBuilder: (_) => [
                        const PopupMenuItem(value: ImageSource.camera, child: Row(children: [Icon(Icons.camera_alt_outlined, size: 18), SizedBox(width: 8), Text('Prendre une photo')])),
                        const PopupMenuItem(value: ImageSource.gallery, child: Row(children: [Icon(Icons.photo_library_outlined, size: 18), SizedBox(width: 8), Text('Galerie')])),
                      ],
                      onSelected: _pickAndUpload,
                    ),
                ],
              ),
            ),
          ),
          if (widget.photos.isEmpty)
            SliverFillRemaining(
              child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.photo_camera_outlined, size: 52, color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.3)),
                const SizedBox(height: 12),
                Text('Aucune photo.', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                const SizedBox(height: 4),
                Text('Appuyez sur + pour en ajouter.', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ])),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (_, i) {
                    final photo = widget.photos[i];
                    return GestureDetector(
                      onTap: () => _viewPhoto(photo),
                      onLongPress: () => _delete(photo),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: photo.signedUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: photo.signedUrl,
                                fit: BoxFit.cover,
                                placeholder: (_, __) => Container(color: const Color(0xFFE2E8F0)),
                                errorWidget: (_, __, ___) => Container(color: const Color(0xFFE2E8F0), child: const Icon(Icons.broken_image_outlined)),
                              )
                            : Container(color: const Color(0xFFE2E8F0), child: const Icon(Icons.image_outlined)),
                      ),
                    );
                  },
                  childCount: widget.photos.length,
                ),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 6,
                  mainAxisSpacing: 6,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Tab 4 — Équipe
// ─────────────────────────────────────────────────────────────

class _TeamTab extends StatefulWidget {
  final String projectId;
  final List<_Member> members;
  final List<models.AppUser> availableUsers;
  final bool loading;
  final Future<void> Function() onReload;

  const _TeamTab({
    required this.projectId,
    required this.members,
    required this.availableUsers,
    required this.loading,
    required this.onReload,
  });

  @override
  State<_TeamTab> createState() => _TeamTabState();
}

class _TeamTabState extends State<_TeamTab> {
  bool _showForm = false;
  bool _saving = false;
  String _selectedUserId = '';
  final _roleCtrl = TextEditingController();

  @override
  void didUpdateWidget(_TeamTab old) {
    super.didUpdateWidget(old);
    if (old.availableUsers.isEmpty && widget.availableUsers.isNotEmpty) {
      _selectedUserId = widget.availableUsers.first.id;
    }
  }

  @override
  void dispose() {
    _roleCtrl.dispose();
    super.dispose();
  }

  Future<void> _addMember() async {
    if (_selectedUserId.isEmpty) return;
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('project_assignments').insert({
        'project_id': widget.projectId,
        'user_id': _selectedUserId,
        'role_on_project': _roleCtrl.text.trim().isEmpty ? null : _roleCtrl.text.trim(),
        'start_date': DateTime.now().toIso8601String().substring(0, 10),
      });
      _roleCtrl.clear();
      setState(() { _showForm = false; _saving = false; });
      widget.onReload();
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _remove(_Member m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Retirer du chantier'),
        content: Text('Retirer ${m.fullName ?? 'ce membre'} de l\'équipe ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Retirer', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Supabase.instance.client.from('project_assignments').delete().eq('id', m.assignmentId);
      widget.onReload();
    } catch (_) {}
  }

  String _roleLabel(String? r) => switch (r) {
    'admin' => 'Admin',
    'manager' => 'Chef de projet',
    'foreman' => 'Chef de chantier',
    'worker' => 'Ouvrier',
    _ => r ?? 'Membre',
  };

  @override
  Widget build(BuildContext context) {
    if (widget.loading) return const Center(child: CircularProgressIndicator());
    final cs = Theme.of(context).colorScheme;

    return RefreshIndicator(
      onRefresh: widget.onReload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Équipe (${widget.members.length})',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      if (widget.availableUsers.isNotEmpty)
                        FilledButton.icon(
                          onPressed: () {
                            if (_selectedUserId.isEmpty && widget.availableUsers.isNotEmpty) {
                              _selectedUserId = widget.availableUsers.first.id;
                            }
                            setState(() => _showForm = !_showForm);
                          },
                          icon: Icon(_showForm ? Icons.close : Icons.person_add_alt_1_outlined, size: 16),
                          label: const Text('Ajouter'),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            textStyle: const TextStyle(fontSize: 13),
                          ),
                        ),
                    ],
                  ),

                  if (_showForm && widget.availableUsers.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _FormField(label: 'Membre *', child: DropdownButtonFormField<String>(
                      value: _selectedUserId.isEmpty ? null : _selectedUserId,
                      decoration: _inputDeco(),
                      items: widget.availableUsers.map((u) => DropdownMenuItem<String>(
                        value: u.id,
                        child: Text(u.fullName ?? u.id, overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: (v) => setState(() => _selectedUserId = v ?? ''),
                    )),
                    const SizedBox(height: 10),
                    _FormField(
                      label: 'Rôle sur le chantier',
                      child: TextFormField(controller: _roleCtrl, decoration: _inputDeco(hint: 'Maçon, chef d\'équipe...')),
                    ),
                    const SizedBox(height: 14),
                    Row(children: [
                      FilledButton(onPressed: _saving ? null : _addMember, child: Text(_saving ? 'Ajout...' : 'Ajouter')),
                      const SizedBox(width: 8),
                      TextButton(onPressed: () => setState(() => _showForm = false), child: const Text('Annuler')),
                    ]),
                    const SizedBox(height: 8),
                  ],

                  if (widget.members.isEmpty && !_showForm) ...[
                    const SizedBox(height: 24),
                    Center(child: Column(children: [
                      Icon(Icons.group_outlined, size: 40, color: cs.onSurfaceVariant.withValues(alpha: 0.3)),
                      const SizedBox(height: 8),
                      Text('Aucun membre assigné.', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
                    ])),
                    const SizedBox(height: 8),
                  ] else ...[
                    const SizedBox(height: 8),
                    ...widget.members.asMap().entries.map((entry) {
                      final i = entry.key;
                      final m = entry.value;
                      return Column(children: [
                        if (i > 0) const Divider(height: 1),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                            child: Text(m.initials,
                                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                          title: Text(m.fullName ?? 'Sans nom', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                          subtitle: Text(
                            m.roleOnProject != null
                                ? m.roleOnProject!
                                : _roleLabel(m.role),
                            style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.person_remove_outlined, size: 18),
                            color: cs.onSurfaceVariant,
                            onPressed: () => _remove(m),
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                      ]);
                    }),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Shared sub-widgets
// ─────────────────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 15, color: cs.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          const Spacer(),
          Flexible(child: Text(value, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500), textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}

class _BudgetCard extends StatelessWidget {
  final double budget;
  final double spent;
  final String currency;
  const _BudgetCard({required this.budget, required this.spent, required this.currency});

  @override
  Widget build(BuildContext context) {
    final pct = budget > 0 ? (spent / budget).clamp(0.0, 1.0) : 0.0;
    final over = spent > budget;
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('Budget', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              if (over)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                  child: Text('Dépassé', style: TextStyle(fontSize: 11, color: AppColors.red, fontWeight: FontWeight.w600)),
                ),
            ]),
            const SizedBox(height: 12),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(_fmt(spent), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: over ? AppColors.red : cs.onSurface)),
              Text('/ ${_fmt(budget)} $currency', style: TextStyle(color: cs.onSurfaceVariant)),
            ]),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct,
                backgroundColor: const Color(0xFFE2E8F0),
                color: over ? AppColors.red : AppColors.green,
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 6),
            Text('${(pct * 100).toStringAsFixed(0)}% du budget consommé',
                style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}K';
    return v.toStringAsFixed(0);
  }
}

class _FormField extends StatelessWidget {
  final String label;
  final Widget child;
  const _FormField({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
      const SizedBox(height: 4),
      child,
    ]);
  }
}

// ─────────────────────────────────────────────────────────────
// Section Tâches (used in Général tab)
// ─────────────────────────────────────────────────────────────

class _TasksSection extends StatefulWidget {
  final List<Map<String, dynamic>> tasks;
  final String projectId;
  final Future<void> Function() onRefresh;
  const _TasksSection({required this.tasks, required this.projectId, required this.onRefresh});

  @override
  State<_TasksSection> createState() => _TasksSectionState();
}

class _TasksSectionState extends State<_TasksSection> {
  final _titleCtrl = TextEditingController();
  bool _showForm = false;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Future<void> _createTask() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    setState(() => _saving = true);
    try {
      await Supabase.instance.client.from('tasks').insert({
        'project_id': widget.projectId,
        'title': title,
        'status': 'todo',
        'priority': 'medium',
      });
      _titleCtrl.clear();
      setState(() { _showForm = false; _saving = false; });
      widget.onRefresh();
    } catch (_) {
      setState(() => _saving = false);
    }
  }

  Future<void> _toggleStatus(String taskId, String currentStatus) async {
    final newStatus = currentStatus == 'done' ? 'todo' : 'done';
    await Supabase.instance.client.from('tasks').update({'status': newStatus}).eq('id', taskId);
    widget.onRefresh();
  }

  String _priorityLabel(String p) => switch (p) { 'high' => 'Haute', 'low' => 'Faible', _ => 'Normale' };
  Color _priorityColor(String p) => switch (p) {
    'high' => AppColors.red,
    'low' => const Color(0xFF94A3B8),
    _ => AppColors.primary,
  };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final done = widget.tasks.where((t) => t['status'] == 'done').length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(
              'Tâches (${widget.tasks.length}${widget.tasks.isNotEmpty ? ' — $done terminée${done > 1 ? 's' : ''}' : ''})',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            )),
            IconButton(
              icon: Icon(_showForm ? Icons.close : Icons.add, size: 20),
              onPressed: () => setState(() => _showForm = !_showForm),
              visualDensity: VisualDensity.compact,
            ),
          ],
        ),
        if (_showForm) ...[
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: TextField(
              controller: _titleCtrl,
              autofocus: true,
              decoration: _inputDeco(hint: 'Titre de la tâche...'),
              onSubmitted: (_) => _createTask(),
            )),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: _saving ? null : _createTask,
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
              child: const Text('Ajouter'),
            ),
          ]),
          const SizedBox(height: 8),
        ],
        if (widget.tasks.isEmpty && !_showForm)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('Aucune tâche. Appuyez sur + pour en ajouter.', style: TextStyle(color: cs.onSurfaceVariant, fontSize: 13)),
          )
        else
          ...widget.tasks.asMap().entries.map((entry) {
            final i = entry.key;
            final task = entry.value;
            final isDone = task['status'] == 'done';
            final priority = task['priority'] as String? ?? 'medium';
            return Column(children: [
              if (i > 0) const Divider(height: 1),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: GestureDetector(
                  onTap: () => _toggleStatus(task['id'] as String, task['status'] as String),
                  child: Container(
                    width: 24, height: 24,
                    decoration: BoxDecoration(
                      color: isDone ? AppColors.green : Colors.transparent,
                      border: Border.all(color: isDone ? AppColors.green : cs.outline, width: 2),
                      shape: BoxShape.circle,
                    ),
                    child: isDone ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
                  ),
                ),
                title: Text(
                  task['title'] as String,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    decoration: isDone ? TextDecoration.lineThrough : null,
                    color: isDone ? cs.onSurfaceVariant : null,
                  ),
                ),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _priorityColor(priority).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(_priorityLabel(priority),
                      style: TextStyle(fontSize: 10, color: _priorityColor(priority), fontWeight: FontWeight.w600)),
                ),
              ),
            ]);
          }),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

InputDecoration _inputDeco({String? hint}) => InputDecoration(
  hintText: hint,
  isDense: true,
  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
);

String _fmtNum(double v) {
  if (v == v.truncateToDouble()) return v.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]} ');
  return v.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+\.)'), (m) => '${m[1]} ');
}

String _fmtShortDate(DateTime d) {
  final months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return '${d.day} ${months[d.month - 1]}';
}
