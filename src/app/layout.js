import ClientLayout from '@/components/ClientLayout';
import './globals.css';

export const metadata = {
  title: 'Orion - Gestão e Regulação de Saúde',
  description: 'ERP para Saúde Pública, Regulação de Exames e Zoonoses',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}