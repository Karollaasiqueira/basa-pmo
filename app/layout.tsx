import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DeskCorp PMO",
  description: "Dashboard de Projetos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, height: '100%' }}>{children}</body>
    </html>
  );
}
