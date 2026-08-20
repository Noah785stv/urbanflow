import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppHeader } from '../components/layout/app-header';
import { AuthProvider } from '../contexts/auth-context';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'UrbanFlow Mobility',
  description: 'Planificateur de trajets multimodaux et empreinte carbone.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu principal
        </a>
        <AuthProvider>
          <AppHeader />
          <div id="main-content" className="flex flex-1 flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
