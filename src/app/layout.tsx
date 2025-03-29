import '@/app/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WorkoutProvider } from '@/lib/workout-context';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/lib/auth-context';
import { OnboardingCheck } from '@/components/onboarding-check';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/lib/theme-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FitBull',
  description: 'Build strength and track your workouts with FitBull',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/fitbull.ico?v=1', sizes: 'any' },
      { url: '/fitbull.png?v=1', type: 'image/png' }
    ],
    apple: '/fitbull.png?v=1',
    shortcut: '/fitbull.ico?v=1',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <WorkoutProvider>
              <Sidebar />
              {children}
              <OnboardingCheck />
              <Toaster />
            </WorkoutProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
