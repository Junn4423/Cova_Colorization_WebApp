import './globals.css';

export const metadata = {
  title: 'Cova Studio - Tô màu ảnh đen trắng với AI',
  description: 'Sử dụng công nghệ Deep Learning để tự động tô màu cho ảnh đen trắng. Nhanh chóng, chính xác và hoàn toàn miễn phí.',
  keywords: 'Cova Studio, AI colorization, tô màu ảnh, deep learning, black and white to color',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎨</text></svg>" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
