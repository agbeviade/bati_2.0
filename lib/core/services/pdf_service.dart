import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/models.dart';

class PdfService {
  static final _primary = PdfColor.fromHex('#1E40AF');
  static final _primaryDark = PdfColor.fromHex('#1E3A8A');
  static final _orange = PdfColor.fromHex('#F97316');
  static final _grey100 = PdfColor.fromHex('#F1F5F9');
  static final _grey300 = PdfColor.fromHex('#CBD5E1');
  static final _grey500 = PdfColor.fromHex('#64748B');
  static final _grey900 = PdfColor.fromHex('#0F172A');
  static final _green = PdfColor.fromHex('#10B981');
  static final _red = PdfColor.fromHex('#EF4444');

  // ── Public API ──────────────────────────────────────────────

  static Future<void> shareQuote(Quote quote, List<Map<String, dynamic>> items) async {
    final company = await _loadCompany();
    final headerImage = await _fetchImage(company?.headerUrl);
    final footerImage = await _fetchImage(company?.footerUrl);
    final bytes = await _buildQuotePdf(quote, items, company, headerImage, footerImage);
    await Printing.sharePdf(
      bytes: bytes,
      filename: 'devis-${quote.quoteNumber}.pdf',
    );
  }

  static Future<void> shareInvoice(Invoice invoice) async {
    final company = await _loadCompany();
    final headerImage = await _fetchImage(company?.headerUrl);
    final footerImage = await _fetchImage(company?.footerUrl);
    final bytes = await _buildInvoicePdf(invoice, company, headerImage, footerImage);
    await Printing.sharePdf(
      bytes: bytes,
      filename: 'facture-${invoice.invoiceNumber}.pdf',
    );
  }

  // ── Image fetcher ───────────────────────────────────────────

  static Future<pw.MemoryImage?> _fetchImage(String? url) async {
    if (url == null || url.isEmpty) return null;
    try {
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        return pw.MemoryImage(response.bodyBytes);
      }
    } catch (_) {}
    return null;
  }

  // ── Company loader ──────────────────────────────────────────

  static Future<Company?> _loadCompany() async {
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) return null;
      final userData = await Supabase.instance.client
          .from('users')
          .select('company_id')
          .eq('id', uid)
          .single();
      final cid = userData['company_id'] as String?;
      if (cid == null) return null;
      final cd = await Supabase.instance.client
          .from('companies')
          .select('id, name, address, phone, email, currency, plan, header_url, footer_url')
          .eq('id', cid)
          .single();
      return Company.fromJson(cd);
    } catch (_) {
      return null;
    }
  }

  // ── Quote PDF ───────────────────────────────────────────────

  static Future<Uint8List> _buildQuotePdf(
    Quote quote,
    List<Map<String, dynamic>> items,
    Company? company,
    pw.MemoryImage? headerImage,
    pw.MemoryImage? footerImage,
  ) async {
    final doc = pw.Document(
      title: 'Devis ${quote.quoteNumber}',
      author: company?.name ?? 'BatiFlow',
    );

    final font = await PdfGoogleFonts.interRegular();
    final fontBold = await PdfGoogleFonts.interBold();
    final fontSemiBold = await PdfGoogleFonts.interSemiBold();

    final baseStyle = pw.TextStyle(font: font, fontSize: 9, color: _grey900);
    final boldStyle = pw.TextStyle(font: fontBold, fontSize: 9, color: _grey900);

    // Group by category
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final item in items) {
      final cat = item['category'] as String? ?? 'other';
      grouped.putIfAbsent(cat, () => []).add(item);
    }
    const catOrder = ['material', 'labor', 'transport', 'equipment', 'other'];
    final sortedCats = catOrder.where(grouped.containsKey).toList();

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (ctx) => _buildHeader(ctx, company, 'DEVIS', quote.quoteNumber,
            quote.createdAt, font, fontBold, fontSemiBold, headerImage),
        footer: (ctx) => _buildFooter(ctx, font, footerImage),
        build: (ctx) => [
          _clientSection(quote.clientName, quote.projectType, quote.validUntil,
              font, fontBold, fontSemiBold),
          pw.SizedBox(height: 16),
          _statusBadge(quote.status, font, fontBold),
          pw.SizedBox(height: 16),
          _itemsTableHeader(font, fontBold),
          ...sortedCats.map((cat) => _categoryBlock(
              cat, grouped[cat]!, font, fontBold, fontSemiBold)),
          pw.SizedBox(height: 8),
          _totalsSection(quote.subtotal, quote.taxRate, quote.total, font,
              fontBold, fontSemiBold),
          pw.SizedBox(height: 20),
          _notesSection(font, fontSemiBold),
        ],
      ),
    );

    return doc.save();
  }

  // ── Invoice PDF ─────────────────────────────────────────────

  static Future<Uint8List> _buildInvoicePdf(
      Invoice invoice, Company? company,
      pw.MemoryImage? headerImage, pw.MemoryImage? footerImage) async {
    final doc = pw.Document(
      title: 'Facture ${invoice.invoiceNumber}',
      author: company?.name ?? 'BatiFlow',
    );

    final font = await PdfGoogleFonts.interRegular();
    final fontBold = await PdfGoogleFonts.interBold();
    final fontSemiBold = await PdfGoogleFonts.interSemiBold();

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            _buildHeader(ctx, company, 'FACTURE', invoice.invoiceNumber,
                invoice.createdAt, font, fontBold, fontSemiBold, headerImage),
            pw.SizedBox(height: 24),
            _clientSection(invoice.clientName, null, null, font, fontBold, fontSemiBold),
            pw.SizedBox(height: 12),
            _invoiceStatusBadge(invoice, font, fontBold),
            pw.SizedBox(height: 24),
            _invoiceAmountBlock(invoice, font, fontBold, fontSemiBold),
            pw.SizedBox(height: 24),
            _invoiceDatesBlock(invoice, font, fontBold, fontSemiBold),
            pw.Spacer(),
            _buildFooter(ctx, font, footerImage),
          ],
        ),
      ),
    );

    return doc.save();
  }

  // ── Shared widgets ──────────────────────────────────────────

  static pw.Widget _buildHeader(
    pw.Context ctx,
    Company? company,
    String docType,
    String docNumber,
    DateTime date,
    pw.Font font,
    pw.Font fontBold,
    pw.Font fontSemiBold,
    pw.MemoryImage? headerImage,
  ) {
    // Si l'entreprise a uploadé une image d'en-tête : l'utiliser pleine largeur
    // puis afficher le type et numéro de document en dessous
    if (headerImage != null) {
      return pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Image(headerImage, width: double.infinity, fit: pw.BoxFit.contain),
          pw.SizedBox(height: 8),
          pw.Container(
            padding: const pw.EdgeInsets.only(bottom: 10),
            decoration: pw.BoxDecoration(
              border: pw.Border(bottom: pw.BorderSide(color: _grey300, width: 0.5)),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.SizedBox(), // spacer
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(docType,
                        style: pw.TextStyle(font: fontBold, fontSize: 20, color: _primary, letterSpacing: 1)),
                    pw.SizedBox(height: 2),
                    pw.Text(docNumber,
                        style: pw.TextStyle(font: fontSemiBold, fontSize: 10, color: _grey900)),
                    pw.Text(_fmtDate(date),
                        style: pw.TextStyle(font: font, fontSize: 8, color: _grey500)),
                  ],
                ),
              ],
            ),
          ),
        ],
      );
    }

    // Fallback texte si pas d'image
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 16),
      decoration: pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: _grey300, width: 1)),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: pw.BoxDecoration(
                    gradient: pw.LinearGradient(colors: [_primaryDark, _primary]),
                    borderRadius: pw.BorderRadius.circular(8),
                  ),
                  child: pw.Text(
                    company?.name ?? 'BATIFLOW',
                    style: pw.TextStyle(font: fontBold, fontSize: 14, color: PdfColors.white, letterSpacing: 0.5),
                  ),
                ),
                pw.SizedBox(height: 6),
                if (company?.address != null)
                  pw.Text(company!.address!, style: pw.TextStyle(font: font, fontSize: 8, color: _grey500)),
                if (company?.phone != null)
                  pw.Text('Tél : ${company!.phone}', style: pw.TextStyle(font: font, fontSize: 8, color: _grey500)),
                if (company?.email != null)
                  pw.Text(company!.email!, style: pw.TextStyle(font: font, fontSize: 8, color: _grey500)),
              ],
            ),
          ),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text(docType,
                  style: pw.TextStyle(font: fontBold, fontSize: 22, color: _primary, letterSpacing: 1)),
              pw.SizedBox(height: 4),
              pw.Text(docNumber,
                  style: pw.TextStyle(font: fontSemiBold, fontSize: 11, color: _grey900)),
              pw.SizedBox(height: 2),
              pw.Text(_fmtDate(date),
                  style: pw.TextStyle(font: font, fontSize: 9, color: _grey500)),
            ],
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildFooter(pw.Context ctx, pw.Font font, pw.MemoryImage? footerImage) {
    // Si l'entreprise a uploadé une image de pied de page : l'utiliser pleine largeur
    if (footerImage != null) {
      return pw.Column(
        children: [
          pw.Container(
            margin: const pw.EdgeInsets.only(top: 8),
            padding: const pw.EdgeInsets.only(bottom: 6),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.end,
              children: [
                pw.Text(
                  'Page ${ctx.pageNumber}/${ctx.pagesCount}',
                  style: pw.TextStyle(font: font, fontSize: 7, color: _grey500),
                ),
              ],
            ),
          ),
          pw.Image(footerImage, width: double.infinity, fit: pw.BoxFit.contain),
        ],
      );
    }

    // Fallback texte
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 16),
      padding: const pw.EdgeInsets.only(top: 8),
      decoration: pw.BoxDecoration(
        border: pw.Border(top: pw.BorderSide(color: _grey300, width: 0.5)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            'Généré par BatiFlow — Gestion BTP Afrique de l\'Ouest',
            style: pw.TextStyle(font: font, fontSize: 7, color: _grey500),
          ),
          pw.Text(
            'Page ${ctx.pageNumber}/${ctx.pagesCount}',
            style: pw.TextStyle(font: font, fontSize: 7, color: _grey500),
          ),
        ],
      ),
    );
  }

  static pw.Widget _clientSection(
    String? clientName,
    String? projectType,
    String? validUntil,
    pw.Font font,
    pw.Font fontBold,
    pw.Font fontSemiBold,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: _grey100,
        borderRadius: pw.BorderRadius.circular(8),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('DESTINATAIRE',
                    style: pw.TextStyle(font: fontBold, fontSize: 7, color: _grey500, letterSpacing: 1)),
                pw.SizedBox(height: 4),
                pw.Text(
                  clientName ?? 'Client',
                  style: pw.TextStyle(font: fontBold, fontSize: 12, color: _grey900),
                ),
                if (projectType != null) ...[
                  pw.SizedBox(height: 2),
                  pw.Text(projectType, style: pw.TextStyle(font: font, fontSize: 9, color: _grey500)),
                ],
              ],
            ),
          ),
          if (validUntil != null)
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text('VALIDE JUSQU\'AU',
                    style: pw.TextStyle(font: fontBold, fontSize: 7, color: _grey500, letterSpacing: 1)),
                pw.SizedBox(height: 4),
                pw.Text(validUntil,
                    style: pw.TextStyle(font: fontSemiBold, fontSize: 10, color: _orange)),
              ],
            ),
        ],
      ),
    );
  }

  static pw.Widget _statusBadge(QuoteStatus status, pw.Font font, pw.Font fontBold) {
    final (label, color) = switch (status) {
      QuoteStatus.draft => ('BROUILLON', _grey500),
      QuoteStatus.sent => ('ENVOYÉ', _primary),
      QuoteStatus.approved => ('APPROUVÉ', _green),
      QuoteStatus.rejected => ('REFUSÉ', _red),
      QuoteStatus.expired => ('EXPIRÉ', _orange),
    };
    return pw.Row(
      children: [
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: pw.BoxDecoration(
            color: PdfColor(color.red, color.green, color.blue, 0.12),
            borderRadius: pw.BorderRadius.circular(20),
            border: pw.Border.all(color: PdfColor(color.red, color.green, color.blue, 0.3), width: 0.5),
          ),
          child: pw.Text(label,
              style: pw.TextStyle(font: fontBold, fontSize: 8, color: color, letterSpacing: 0.5)),
        ),
      ],
    );
  }

  static pw.Widget _itemsTableHeader(pw.Font font, pw.Font fontBold) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: pw.BoxDecoration(
        gradient: pw.LinearGradient(colors: [_primaryDark, _primary]),
        borderRadius: const pw.BorderRadius.only(
          topLeft: pw.Radius.circular(6),
          topRight: pw.Radius.circular(6),
        ),
      ),
      child: pw.Row(
        children: [
          pw.Expanded(
            flex: 4,
            child: pw.Text('DÉSIGNATION',
                style: pw.TextStyle(font: fontBold, fontSize: 8, color: PdfColors.white, letterSpacing: 0.5)),
          ),
          pw.SizedBox(
            width: 50,
            child: pw.Text('QTÉ',
                style: pw.TextStyle(font: fontBold, fontSize: 8, color: PdfColors.white),
                textAlign: pw.TextAlign.right),
          ),
          pw.SizedBox(
            width: 20,
            child: pw.Text('U',
                style: pw.TextStyle(font: fontBold, fontSize: 8, color: PdfColors.white),
                textAlign: pw.TextAlign.center),
          ),
          pw.SizedBox(
            width: 70,
            child: pw.Text('P.U.',
                style: pw.TextStyle(font: fontBold, fontSize: 8, color: PdfColors.white),
                textAlign: pw.TextAlign.right),
          ),
          pw.SizedBox(
            width: 75,
            child: pw.Text('TOTAL',
                style: pw.TextStyle(font: fontBold, fontSize: 8, color: PdfColors.white),
                textAlign: pw.TextAlign.right),
          ),
        ],
      ),
    );
  }

  static pw.Widget _categoryBlock(
    String cat,
    List<Map<String, dynamic>> items,
    pw.Font font,
    pw.Font fontBold,
    pw.Font fontSemiBold,
  ) {
    final label = switch (cat) {
      'material' => 'Matériaux',
      'labor' => 'Main d\'œuvre',
      'transport' => 'Transport',
      'equipment' => 'Équipement',
      _ => 'Autres',
    };
    final catColor = switch (cat) {
      'material' => _primary,
      'labor' => _orange,
      'transport' => _green,
      'equipment' => PdfColor.fromHex('#7C3AED'),
      _ => _grey500,
    };

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          width: double.infinity,
          padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          color: PdfColor(catColor.red, catColor.green, catColor.blue, 0.07),
          child: pw.Text(
            label.toUpperCase(),
            style: pw.TextStyle(font: fontBold, fontSize: 7.5, color: catColor, letterSpacing: 0.8),
          ),
        ),
        ...items.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          final qty = (item['qty'] as num?)?.toDouble() ?? 0;
          final unit = item['unit'] as String? ?? 'u';
          final unitPrice = (item['unit_price'] as num?)?.toDouble() ?? 0;
          final total = (item['total_price'] as num?)?.toDouble() ?? qty * unitPrice;
          final bg = i % 2 == 0 ? PdfColors.white : _grey100;

          return pw.Container(
            color: bg,
            padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 5),
            child: pw.Row(
              children: [
                pw.Expanded(
                  flex: 4,
                  child: pw.Text(
                    item['description'] as String? ?? '',
                    style: pw.TextStyle(font: font, fontSize: 8.5, color: _grey900),
                  ),
                ),
                pw.SizedBox(
                  width: 50,
                  child: pw.Text(
                    _fmtQty(qty),
                    style: pw.TextStyle(font: fontSemiBold, fontSize: 8.5, color: _grey900),
                    textAlign: pw.TextAlign.right,
                  ),
                ),
                pw.SizedBox(
                  width: 20,
                  child: pw.Text(
                    unit,
                    style: pw.TextStyle(font: font, fontSize: 8, color: _grey500),
                    textAlign: pw.TextAlign.center,
                  ),
                ),
                pw.SizedBox(
                  width: 70,
                  child: pw.Text(
                    _fmtAmount(unitPrice),
                    style: pw.TextStyle(font: font, fontSize: 8.5, color: _grey900),
                    textAlign: pw.TextAlign.right,
                  ),
                ),
                pw.SizedBox(
                  width: 75,
                  child: pw.Text(
                    _fmtAmount(total),
                    style: pw.TextStyle(font: fontSemiBold, fontSize: 8.5, color: _grey900),
                    textAlign: pw.TextAlign.right,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  static pw.Widget _totalsSection(
    double subtotal,
    double taxRate,
    double total,
    pw.Font font,
    pw.Font fontBold,
    pw.Font fontSemiBold,
  ) {
    final tva = subtotal * taxRate;
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.end,
      children: [
        pw.Container(
          width: 240,
          padding: const pw.EdgeInsets.all(12),
          decoration: pw.BoxDecoration(
            color: _grey100,
            borderRadius: pw.BorderRadius.circular(8),
          ),
          child: pw.Column(
            children: [
              _totalRow('Sous-total HT', _fmtAmount(subtotal), font, fontSemiBold, false),
              pw.SizedBox(height: 4),
              _totalRow('TVA ${(taxRate * 100).toStringAsFixed(0)}%', _fmtAmount(tva), font, fontSemiBold, false),
              pw.Container(
                margin: const pw.EdgeInsets.symmetric(vertical: 6),
                height: 0.5,
                color: _grey300,
              ),
              _totalRow('TOTAL TTC', _fmtAmount(total), fontBold, fontBold, true),
            ],
          ),
        ),
      ],
    );
  }

  static pw.Widget _totalRow(
    String label,
    String value,
    pw.Font labelFont,
    pw.Font valueFont,
    bool highlight,
  ) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(font: labelFont, fontSize: highlight ? 10 : 9, color: highlight ? _grey900 : _grey500),
        ),
        pw.Text(
          value,
          style: pw.TextStyle(font: valueFont, fontSize: highlight ? 11 : 9, color: highlight ? _primary : _grey900),
        ),
      ],
    );
  }

  static pw.Widget _notesSection(pw.Font font, pw.Font fontSemiBold) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: _grey300, width: 0.5),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('Notes', style: pw.TextStyle(font: fontSemiBold, fontSize: 8, color: _grey500)),
          pw.SizedBox(height: 4),
          pw.Text(
            'Les prix indiqués sont en Francs CFA (XOF). Ce devis est valable pour la durée mentionnée. '
            'Tout travail supplémentaire fera l\'objet d\'un avenant.',
            style: pw.TextStyle(font: font, fontSize: 8, color: _grey500),
          ),
        ],
      ),
    );
  }

  // ── Invoice-specific widgets ────────────────────────────────

  static pw.Widget _invoiceStatusBadge(Invoice invoice, pw.Font font, pw.Font fontBold) {
    final isOverdue = invoice.isOverdue;
    final (label, color) = switch (invoice.status) {
      InvoiceStatus.draft => ('BROUILLON', _grey500),
      InvoiceStatus.sent => isOverdue ? ('EN RETARD', _red) : ('ENVOYÉE', _primary),
      InvoiceStatus.paid => ('PAYÉE', _green),
      InvoiceStatus.overdue => ('EN RETARD', _red),
      InvoiceStatus.canceled => ('ANNULÉE', _grey500),
    };
    return pw.Row(
      children: [
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: pw.BoxDecoration(
            color: PdfColor(color.red, color.green, color.blue, 0.12),
            borderRadius: pw.BorderRadius.circular(20),
            border: pw.Border.all(color: PdfColor(color.red, color.green, color.blue, 0.4), width: 0.5),
          ),
          child: pw.Text(label,
              style: pw.TextStyle(font: fontBold, fontSize: 8, color: color, letterSpacing: 0.5)),
        ),
      ],
    );
  }

  static pw.Widget _invoiceAmountBlock(
    Invoice invoice,
    pw.Font font,
    pw.Font fontBold,
    pw.Font fontSemiBold,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(20),
      decoration: pw.BoxDecoration(
        gradient: pw.LinearGradient(
          colors: [_primaryDark, _primary],
          begin: pw.Alignment.centerLeft,
          end: pw.Alignment.centerRight,
        ),
        borderRadius: pw.BorderRadius.circular(12),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('MONTANT TOTAL',
                  style: pw.TextStyle(font: fontBold, fontSize: 9, color: const PdfColor(1, 1, 1, 0.7), letterSpacing: 1)),
              pw.SizedBox(height: 6),
              pw.Text(
                '${_fmtAmount(invoice.amount)} XOF',
                style: pw.TextStyle(font: fontBold, fontSize: 24, color: PdfColors.white),
              ),
            ],
          ),
          pw.Container(
            width: 40,
            height: 40,
            decoration: pw.BoxDecoration(
              color: const PdfColor(1, 1, 1, 0.2),
              borderRadius: pw.BorderRadius.circular(10),
            ),
            child: pw.Center(
              child: pw.Text('₣',
                  style: pw.TextStyle(font: fontBold, fontSize: 22, color: PdfColors.white)),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _invoiceDatesBlock(
    Invoice invoice,
    pw.Font font,
    pw.Font fontBold,
    pw.Font fontSemiBold,
  ) {
    final rows = <(String, String, bool)>[
      ('Date d\'émission', _fmtDate(invoice.createdAt), false),
      if (invoice.dueDate != null) ('Date d\'échéance', invoice.dueDate!, invoice.isOverdue),
      if (invoice.paidAt != null) ('Payée le', invoice.paidAt!.substring(0, 10), false),
    ];

    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: _grey100,
        borderRadius: pw.BorderRadius.circular(8),
      ),
      child: pw.Column(
        children: rows.map((row) {
          final (label, value, urgent) = row;
          return pw.Padding(
            padding: const pw.EdgeInsets.symmetric(vertical: 3),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(label, style: pw.TextStyle(font: font, fontSize: 9, color: _grey500)),
                pw.Text(
                  value,
                  style: pw.TextStyle(
                    font: fontSemiBold,
                    fontSize: 9,
                    color: urgent ? _red : _grey900,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────

  static String _fmtAmount(double v) {
    final parts = v.toStringAsFixed(0).split('');
    final result = StringBuffer();
    for (var i = 0; i < parts.length; i++) {
      if (i > 0 && (parts.length - i) % 3 == 0) result.write(' ');
      result.write(parts[i]);
    }
    return result.toString();
  }

  static String _fmtQty(double v) {
    if (v == v.truncateToDouble()) return v.toStringAsFixed(0);
    return v.toStringAsFixed(2);
  }

  static String _fmtDate(DateTime d) {
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    return '${d.day.toString().padLeft(2, '0')} ${months[d.month - 1]} ${d.year}';
  }
}
