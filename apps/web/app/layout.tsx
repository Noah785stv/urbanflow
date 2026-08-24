import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { AppHeader } from '../components/layout/app-header';
import { AuthProvider } from '../contexts/auth-context';
import './globals.css';

// Design system §3 : IBM Plex Sans pour l'interface, IBM Plex Mono (500) pour
// les données chiffrées (durées, CO2, tarifs) uniquement — poids limités à
// ceux réellement utilisés par les styles définis (§3), pas de chargement
// superflu.
const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  subsets: ['latin'],
  weight: ['400', '600'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['500'],
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
    <html
      lang="fr"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-50 text-ink-900">
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
