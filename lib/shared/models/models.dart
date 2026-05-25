// Mirrors lib/supabase/types.ts — same data model, same Supabase backend

enum UserRole { superAdmin, admin, manager, foreman, worker, client }

enum ProjectStatus { planned, inProgress, paused, completed, canceled }

enum TaskStatus { todo, inProgress, done, blocked }

enum QuoteStatus { draft, sent, approved, rejected, expired }

enum InvoiceStatus { draft, sent, paid, overdue, canceled }

enum MovementType { purchase, use, returnItem, adjustment }

// ── Helpers ─────────────────────────────────────────────────

UserRole userRoleFromString(String s) => switch (s) {
      'super_admin' => UserRole.superAdmin,
      'admin' => UserRole.admin,
      'manager' => UserRole.manager,
      'foreman' => UserRole.foreman,
      'worker' => UserRole.worker,
      _ => UserRole.client,
    };

ProjectStatus projectStatusFromString(String s) => switch (s) {
      'in_progress' => ProjectStatus.inProgress,
      'paused' => ProjectStatus.paused,
      'completed' => ProjectStatus.completed,
      'canceled' => ProjectStatus.canceled,
      _ => ProjectStatus.planned,
    };

String projectStatusToString(ProjectStatus s) => switch (s) {
      ProjectStatus.planned => 'planned',
      ProjectStatus.inProgress => 'in_progress',
      ProjectStatus.paused => 'paused',
      ProjectStatus.completed => 'completed',
      ProjectStatus.canceled => 'canceled',
    };

QuoteStatus quoteStatusFromString(String s) => switch (s) {
      'sent' => QuoteStatus.sent,
      'approved' => QuoteStatus.approved,
      'rejected' => QuoteStatus.rejected,
      'expired' => QuoteStatus.expired,
      _ => QuoteStatus.draft,
    };

InvoiceStatus invoiceStatusFromString(String s) => switch (s) {
      'sent' => InvoiceStatus.sent,
      'paid' => InvoiceStatus.paid,
      'overdue' => InvoiceStatus.overdue,
      'canceled' => InvoiceStatus.canceled,
      _ => InvoiceStatus.draft,
    };

// ── Models ───────────────────────────────────────────────────

class AppUser {
  final String id;
  final String? companyId;
  final UserRole role;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? specialty;
  final double? dailyRate;
  final bool isActive;

  const AppUser({
    required this.id,
    this.companyId,
    required this.role,
    this.fullName,
    this.email,
    this.phone,
    this.specialty,
    this.dailyRate,
    required this.isActive,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        companyId: j['company_id'] as String?,
        role: userRoleFromString(j['role'] as String? ?? 'worker'),
        fullName: j['full_name'] as String?,
        email: j['email'] as String?,
        phone: j['phone'] as String?,
        specialty: j['specialty'] as String?,
        dailyRate: (j['daily_rate'] as num?)?.toDouble(),
        isActive: j['is_active'] as bool? ?? true,
      );

  String get initials {
    if (fullName == null || fullName!.isEmpty) return '?';
    return fullName!.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase();
  }
}

class Company {
  final String id;
  final String name;
  final String? address;
  final String? phone;
  final String? email;
  final String currency;
  final String plan;
  final String? headerUrl;
  final String? footerUrl;

  const Company({
    required this.id,
    required this.name,
    this.address,
    this.phone,
    this.email,
    required this.currency,
    required this.plan,
    this.headerUrl,
    this.footerUrl,
  });

  factory Company.fromJson(Map<String, dynamic> j) => Company(
        id: j['id'] as String,
        name: j['name'] as String,
        address: j['address'] as String?,
        phone: j['phone'] as String?,
        email: j['email'] as String?,
        currency: j['currency'] as String? ?? 'XOF',
        plan: j['plan'] as String? ?? 'free',
        headerUrl: j['header_url'] as String?,
        footerUrl: j['footer_url'] as String?,
      );
}

class Project {
  final String id;
  final String companyId;
  final String name;
  final String? description;
  final String? address;
  final double? geoLat;
  final double? geoLng;
  final double? budget;
  final double spent;
  final String? startDate;
  final String? endDate;
  final ProjectStatus status;
  final int progressPct;

  const Project({
    required this.id,
    required this.companyId,
    required this.name,
    this.description,
    this.address,
    this.geoLat,
    this.geoLng,
    this.budget,
    required this.spent,
    this.startDate,
    this.endDate,
    required this.status,
    required this.progressPct,
  });

  factory Project.fromJson(Map<String, dynamic> j) => Project(
        id: j['id'] as String,
        companyId: j['company_id'] as String,
        name: j['name'] as String,
        description: j['description'] as String?,
        address: j['address'] as String?,
        geoLat: (j['geo_lat'] as num?)?.toDouble(),
        geoLng: (j['geo_lng'] as num?)?.toDouble(),
        budget: (j['budget'] as num?)?.toDouble(),
        spent: (j['spent'] as num?)?.toDouble() ?? 0,
        startDate: j['start_date'] as String?,
        endDate: j['end_date'] as String?,
        status: projectStatusFromString(j['status'] as String? ?? 'planned'),
        progressPct: j['progress_pct'] as int? ?? 0,
      );
}

class Team {
  final String id;
  final String name;
  final String? leadId;

  const Team({required this.id, required this.name, this.leadId});

  factory Team.fromJson(Map<String, dynamic> j) => Team(
        id: j['id'] as String,
        name: j['name'] as String,
        leadId: j['lead_id'] as String?,
      );
}

class Attendance {
  final String id;
  final String userId;
  final String? projectId;
  final DateTime checkIn;
  final DateTime? checkOut;
  final double? geoLatIn;
  final double? geoLngIn;
  final double? geoLatOut;
  final double? geoLngOut;
  final double? hoursWorked;

  const Attendance({
    required this.id,
    required this.userId,
    this.projectId,
    required this.checkIn,
    this.checkOut,
    this.geoLatIn,
    this.geoLngIn,
    this.geoLatOut,
    this.geoLngOut,
    this.hoursWorked,
  });

  bool get isOpen => checkOut == null;

  factory Attendance.fromJson(Map<String, dynamic> j) => Attendance(
        id: j['id'] as String,
        userId: j['user_id'] as String,
        projectId: j['project_id'] as String?,
        checkIn: DateTime.parse(j['check_in'] as String),
        checkOut: j['check_out'] != null ? DateTime.parse(j['check_out'] as String) : null,
        geoLatIn: (j['geo_lat_in'] as num?)?.toDouble(),
        geoLngIn: (j['geo_lng_in'] as num?)?.toDouble(),
        geoLatOut: (j['geo_lat_out'] as num?)?.toDouble(),
        geoLngOut: (j['geo_lng_out'] as num?)?.toDouble(),
        hoursWorked: (j['hours_worked'] as num?)?.toDouble(),
      );
}

class Quote {
  final String id;
  final String quoteNumber;
  final String? clientName;
  final String? projectType;
  final double? surfaceM2;
  final double subtotal;
  final double taxRate;
  final double marginPct;
  final double total;
  final QuoteStatus status;
  final String? validUntil;
  final String? notes;
  final String? projectId;
  final String? pdfUrl;
  final DateTime createdAt;

  const Quote({
    required this.id,
    required this.quoteNumber,
    this.clientName,
    this.projectType,
    this.surfaceM2,
    required this.subtotal,
    required this.taxRate,
    required this.marginPct,
    required this.total,
    required this.status,
    this.validUntil,
    this.notes,
    this.projectId,
    this.pdfUrl,
    required this.createdAt,
  });

  factory Quote.fromJson(Map<String, dynamic> j) => Quote(
        id: j['id'] as String,
        quoteNumber: j['quote_number'] as String,
        clientName: j['client_name'] as String?,
        projectType: j['project_type'] as String?,
        surfaceM2: (j['surface_m2'] as num?)?.toDouble(),
        subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
        taxRate: (j['tax_rate'] as num?)?.toDouble() ?? 0,
        marginPct: (j['margin_pct'] as num?)?.toDouble() ?? 0,
        total: (j['total'] as num?)?.toDouble() ?? 0,
        status: quoteStatusFromString(j['status'] as String? ?? 'draft'),
        validUntil: j['valid_until'] as String?,
        notes: j['notes'] as String?,
        projectId: j['project_id'] as String?,
        pdfUrl: j['pdf_url'] as String?,
        createdAt: DateTime.parse(j['created_at'] as String),
      );
}

class Invoice {
  final String id;
  final String invoiceNumber;
  final String? clientName;
  final double amount;
  final InvoiceStatus status;
  final String? dueDate;
  final String? paidAt;
  final String? pdfUrl;
  final String? notes;
  final String? projectId;
  final String? quoteId;
  final DateTime createdAt;

  const Invoice({
    required this.id,
    required this.invoiceNumber,
    this.clientName,
    required this.amount,
    required this.status,
    this.dueDate,
    this.paidAt,
    this.pdfUrl,
    this.notes,
    this.projectId,
    this.quoteId,
    required this.createdAt,
  });

  bool get isOverdue =>
      status == InvoiceStatus.overdue ||
      (status == InvoiceStatus.sent &&
          dueDate != null &&
          DateTime.parse(dueDate!).isBefore(DateTime.now()));

  factory Invoice.fromJson(Map<String, dynamic> j) => Invoice(
        id: j['id'] as String,
        invoiceNumber: j['invoice_number'] as String,
        clientName: j['client_name'] as String?,
        amount: (j['amount'] as num?)?.toDouble() ?? 0,
        status: invoiceStatusFromString(j['status'] as String? ?? 'draft'),
        dueDate: j['due_date'] as String?,
        paidAt: j['paid_at'] as String?,
        pdfUrl: j['pdf_url'] as String?,
        notes: j['notes'] as String?,
        projectId: j['project_id'] as String?,
        quoteId: j['quote_id'] as String?,
        createdAt: DateTime.parse(j['created_at'] as String),
      );
}

enum PaymentMethod { cash, transfer, check, other }

PaymentMethod paymentMethodFromString(String s) => switch (s) {
      'transfer' => PaymentMethod.transfer,
      'check' => PaymentMethod.check,
      'other' => PaymentMethod.other,
      _ => PaymentMethod.cash,
    };

String paymentMethodToString(PaymentMethod m) => switch (m) {
      PaymentMethod.cash => 'cash',
      PaymentMethod.transfer => 'transfer',
      PaymentMethod.check => 'check',
      PaymentMethod.other => 'other',
    };

String paymentMethodLabel(PaymentMethod m) => switch (m) {
      PaymentMethod.cash => 'Espèces',
      PaymentMethod.transfer => 'Virement',
      PaymentMethod.check => 'Chèque',
      PaymentMethod.other => 'Autre',
    };

class Payment {
  final String id;
  final String invoiceId;
  final double amount;
  final PaymentMethod method;
  final String? reference;
  final DateTime paidAt;

  const Payment({
    required this.id,
    required this.invoiceId,
    required this.amount,
    required this.method,
    this.reference,
    required this.paidAt,
  });

  factory Payment.fromJson(Map<String, dynamic> j) => Payment(
        id: j['id'] as String,
        invoiceId: j['invoice_id'] as String,
        amount: (j['amount'] as num).toDouble(),
        method: paymentMethodFromString(j['method'] as String? ?? 'cash'),
        reference: j['reference'] as String?,
        paidAt: DateTime.parse(j['paid_at'] as String),
      );
}

class Material {
  final String id;
  final String name;
  final String category;
  final String unit;
  final double stockQty;
  final double unitCost;

  const Material({
    required this.id,
    required this.name,
    required this.category,
    required this.unit,
    required this.stockQty,
    required this.unitCost,
  });

  factory Material.fromJson(Map<String, dynamic> j) => Material(
        id: j['id'] as String,
        name: j['name'] as String,
        category: j['category'] as String? ?? 'other',
        unit: j['unit'] as String? ?? 'u',
        stockQty: (j['stock_qty'] as num?)?.toDouble() ?? 0,
        unitCost: (j['unit_cost'] as num?)?.toDouble() ?? 0,
      );
}
