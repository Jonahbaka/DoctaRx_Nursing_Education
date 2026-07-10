import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'DoctaRx Nursing Education & Clinical Training Platform',
    template: '%s | DoctaRx Nursing Education',
  },
  description: 'Digital nursing education, clinical simulation, telehealth skills training, and academic evidence management for nursing institutions.',
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#052e2b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
