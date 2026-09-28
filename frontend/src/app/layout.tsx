import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'LeafAI - Chẩn đoán bệnh cây trồng',
  description: 'LeafAI hỗ trợ người Việt quan sát lá và tìm hiểu bệnh cây trồng bằng trí tuệ nhân tạo.',
  openGraph: {
    title: 'LeafAI - Chẩn đoán bệnh cây trồng',
    description: 'Cùng người Việt chăm sóc cây trồng với trải nghiệm chẩn đoán trực quan và thân thiện.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
