export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
        }
        .print-root { font-family: system-ui, sans-serif; background: white; color: #111; }
      `}</style>
      <div className="print-root">{children}</div>
    </>
  );
}
