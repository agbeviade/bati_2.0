import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Quote, QuoteItem, Company } from "@/lib/supabase/types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ---------------------------------------------------------------------------
// GET /api/pdf/quote?id=<quote_id>
// Génère le PDF du devis, l'upload dans le bucket Supabase et retourne l'URL.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const quoteId = request.nextUrl.searchParams.get("id");
  if (!quoteId) return NextResponse.json({ error: "Paramètre id manquant." }, { status: 400 });

  const admin = createAdminClient(); // storage upload requires admin

  const { data: quoteData } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!quoteData) return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  const quote = quoteData as Quote;

  const { data: itemsData } = await supabase
    .from("quote_items").select("*").eq("quote_id", quoteId).order("sort_order");
  const items = (itemsData ?? []) as QuoteItem[];

  const { data: companyData } = await supabase
    .from("companies").select("name, currency, address, phone, email").eq("id", quote.company_id).maybeSingle();
  const company = companyData as Pick<Company, "name" | "currency" | "address" | "phone" | "email"> | null;
  const currency = company?.currency ?? "XOF";

  // ---------------------------------------------------------------------------
  // Génération PDF
  // ---------------------------------------------------------------------------
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  function fmt(n: number) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " " + currency;
  }
  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  // En-tête : entreprise à gauche, numéro devis à droite
  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text(company?.name ?? "—", margin, 22);

  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100);
  let headerY = 28;
  if (company?.address) { doc.text(company.address, margin, headerY); headerY += 5; }
  if (company?.phone)   { doc.text(company.phone, margin, headerY); headerY += 5; }
  if (company?.email)   { doc.text(company.email, margin, headerY); }

  doc.setFontSize(22).setFont("helvetica", "bold").setTextColor(37, 99, 235);
  doc.text("DEVIS", pageW - margin, 22, { align: "right" });

  doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(0);
  doc.text(quote.quote_number, pageW - margin, 30, { align: "right" });

  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100);
  doc.text(`Créé le ${fmtDate(quote.created_at)}`, pageW - margin, 36, { align: "right" });
  if (quote.valid_until) {
    doc.text(`Valide jusqu'au ${fmtDate(quote.valid_until)}`, pageW - margin, 41, { align: "right" });
  }

  // Encadré client
  const boxY = 52;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, boxY, pageW - margin * 2, 22, 2, 2, "FD");
  doc.setFontSize(7).setFont("helvetica", "bold").setTextColor(136);
  doc.text("CLIENT", margin + 4, boxY + 6);
  doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(0);
  doc.text(quote.client_name ?? "—", margin + 4, boxY + 12);
  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100);
  if (quote.project_type) doc.text(`Travaux : ${quote.project_type}`, margin + 4, boxY + 18);
  if (quote.surface_m2)   doc.text(`Surface : ${quote.surface_m2} m²`, margin + 80, boxY + 18);

  // Lignes par catégorie
  const CATEGORY_LABEL: Record<string, string> = {
    material: "Matériaux", labor: "Main d'œuvre", transport: "Transport",
    equipment: "Équipement", other: "Autre",
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, QuoteItem[]>);

  let tableY = boxY + 28;
  for (const [cat, catItems] of Object.entries(grouped)) {
    doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(37, 99, 235);
    doc.text((CATEGORY_LABEL[cat] ?? cat).toUpperCase(), margin, tableY);
    tableY += 2;

    autoTable(doc, {
      startY: tableY,
      margin: { left: margin, right: margin },
      head: [["Description", "Qté", "Unité", "Prix unitaire", "Total"]],
      body: catItems.map((i) => [i.label, String(i.quantity), i.unit, fmt(i.unit_price), fmt(i.total)]),
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right", cellWidth: 14 },
        2: { cellWidth: 14 },
        3: { halign: "right", cellWidth: 34 },
        4: { halign: "right", cellWidth: 34 },
      },
      didDrawPage: () => {},
    });

    tableY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Totaux
  const totalsX = pageW - margin - 70;
  const rows: [string, string][] = [
    ["Sous-total HT", fmt(quote.subtotal)],
  ];
  if (quote.tax_rate > 0)   rows.push([`TVA (${quote.tax_rate}%)`, fmt(quote.tax_amount)]);
  if (quote.margin_pct > 0) rows.push([`Marge (${quote.margin_pct}%)`, fmt(quote.subtotal * quote.margin_pct / 100)]);

  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(80);
  let rY = tableY + 4;
  for (const [label, val] of rows) {
    doc.text(label, totalsX, rY);
    doc.text(val, pageW - margin, rY, { align: "right" });
    rY += 5;
  }
  doc.setLineWidth(0.3).setDrawColor(0).line(totalsX, rY, pageW - margin, rY);
  rY += 5;
  doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(37, 99, 235);
  doc.text("Total TTC", totalsX, rY);
  doc.text(fmt(quote.total), pageW - margin, rY, { align: "right" });

  // Notes
  if (quote.notes) {
    rY += 14;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    const noteLines = doc.splitTextToSize(quote.notes, pageW - margin * 2 - 8);
    const noteH = noteLines.length * 4 + 10;
    doc.roundedRect(margin, rY, pageW - margin * 2, noteH, 2, 2, "FD");
    doc.setFontSize(7).setFont("helvetica", "bold").setTextColor(146, 64, 14);
    doc.text("NOTES", margin + 4, rY + 6);
    doc.setFont("helvetica", "normal").setTextColor(68, 68, 68).setFontSize(8);
    doc.text(noteLines, margin + 4, rY + 12);
  }

  // Pied de page
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(170);
  doc.text(
    `Document généré par BatiFlow · ${company?.name ?? ""} · ${fmtDate(new Date().toISOString())}`,
    pageW / 2, pageH - 8,
    { align: "center" }
  );

  // ---------------------------------------------------------------------------
  // Upload vers Supabase storage + mise à jour quote.pdf_url
  // ---------------------------------------------------------------------------
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const storagePath = `${quote.company_id}/${quote.quote_number.replace(/\//g, "-")}.pdf`;

  const { error: uploadErr } = await admin.storage
    .from("quote-pdfs")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    // Bucket absent ou autre erreur → retourner le PDF directement sans stocker l'URL
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.quote_number.replace(/\//g, "-")}.pdf"`,
      },
    });
  }

  const { data: { publicUrl } } = admin.storage.from("quote-pdfs").getPublicUrl(storagePath);

  // Mettre à jour pdf_url sur le devis
  await supabase.from("quotes").update({ pdf_url: publicUrl }).eq("id", quoteId);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number.replace(/\//g, "-")}.pdf"`,
    },
  });
}
