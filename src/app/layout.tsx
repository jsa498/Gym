import '@/app/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WorkoutProvider } from '@/lib/workout-context';
import { Sidebar } from '@/components/sidebar';
import { AuthProvider } from '@/lib/auth-context';
import { OnboardingCheck } from '@/components/onboarding-check';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workout Tracker',
  description: 'Track your workouts with this modern app',
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
          <WorkoutProvider>
            <Sidebar />
            {children}
            <OnboardingCheck />
          </WorkoutProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
