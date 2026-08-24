import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Iglesia San Agustín | Una comunidad de fe',
  description: 'Un lugar para creer, crecer y pertenecer. Conoce la comunidad y los horarios de la Iglesia San Agustín.',
  openGraph: { title: 'Iglesia San Agustín', description: 'Un lugar para creer, crecer y pertenecer.', type: 'website', images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: 'Iglesia San Agustín', description: 'Un lugar para creer, crecer y pertenecer.', images: ['/og.png'] },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'San Agustín' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
