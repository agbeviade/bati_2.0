export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body { font-family: system-ui, sans-serif; margin: 0; background: white; color: #111; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
