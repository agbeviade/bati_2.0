import 'package:flutter/material.dart';
import '../models/models.dart';

class ProjectStatusBadge extends StatelessWidget {
  final ProjectStatus status;
  const ProjectStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      ProjectStatus.planned => ('Planifié', const Color(0xFFF1F5F9), const Color(0xFF475569)),
      ProjectStatus.inProgress => ('En cours', const Color(0xFFDBEAFE), const Color(0xFF1D4ED8)),
      ProjectStatus.paused => ('Pausé', const Color(0xFFFEF9C3), const Color(0xFF92400E)),
      ProjectStatus.completed => ('Terminé', const Color(0xFFDCFCE7), const Color(0xFF166534)),
      ProjectStatus.canceled => ('Annulé', const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}

class QuoteStatusBadge extends StatelessWidget {
  final QuoteStatus status;
  const QuoteStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      QuoteStatus.draft => ('Brouillon', const Color(0xFFF1F5F9), const Color(0xFF475569)),
      QuoteStatus.sent => ('Envoyé', const Color(0xFFDBEAFE), const Color(0xFF1D4ED8)),
      QuoteStatus.approved => ('Approuvé', const Color(0xFFDCFCE7), const Color(0xFF166534)),
      QuoteStatus.rejected => ('Refusé', const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
      QuoteStatus.expired => ('Expiré', const Color(0xFFF1F5F9), const Color(0xFF94A3B8)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}

class InvoiceStatusBadge extends StatelessWidget {
  final InvoiceStatus status;
  const InvoiceStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (status) {
      InvoiceStatus.draft => ('Brouillon', const Color(0xFFF1F5F9), const Color(0xFF475569)),
      InvoiceStatus.sent => ('Envoyée', const Color(0xFFDBEAFE), const Color(0xFF1D4ED8)),
      InvoiceStatus.paid => ('Payée', const Color(0xFFDCFCE7), const Color(0xFF166534)),
      InvoiceStatus.overdue => ('En retard', const Color(0xFFFEE2E2), const Color(0xFF991B1B)),
      InvoiceStatus.canceled => ('Annulée', const Color(0xFFF1F5F9), const Color(0xFF94A3B8)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}
