import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../index.css';

const manrope = Manrope({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'AgriAI - Phân loại bệnh lá cây',
  description: 'AgriAI hỗ trợ người Việt phân loại bệnh lá cây từ hình ảnh bằng trí tuệ nhân tạo.',
  openGraph: {
    title: 'AgriAI - Phân loại bệnh lá cây',
    description: 'Phân loại bệnh lá cây với kết quả rõ ràng và độ tin cậy minh bạch.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={manrope.variable}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
