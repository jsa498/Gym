'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostSignupSetup } from '@/components/post-signup-setup';
import { useAuth } from '@/lib/auth-context';

function SetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const forceParam = searchParams.get('force');
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [forceSetup, setForceSetup] = useState(forceParam === 'true');

  // If no userId or not authenticated, redirect to home
  useEffect(() => {
    const checkSetupStatus = async () => {
      setIsLoading(true);
      
      // Set force setup if URL parameter is present
      if (forceParam === 'true') {
        setForceSetup(true);
      }
      
      // If no user or userId, wait for auth to initialize
      if (!userId && user) {
        // If we have a user but no userId, set it from auth
        router.replace(`/setup?userId=${user.id}${forceParam === 'true' ? '&force=true' : ''}`);
        return;
      }
      
      if (!userId || !user) {
        // Don't redirect here, as the user might still be loading
        setIsLoading(false);
        return;
      }
      
      // For simplicity, just always force setup to ensure it completes
      setForceSetup(true);
      setIsLoading(false);
    };
    
    checkSetupStatus();
  }, [userId, user, router, forceParam]);

  // If still loading or no user, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Loading setup...</p>
        </div>
      </div>
    );
  }

  // If no user or userId and not loading, redirect to home
  if (!isLoading && (!userId || !user) && !forceSetup) {
    router.replace('/');
    return null;
  }

  return (
    <PostSignupSetup
      isOpen={true}
      onClose={() => router.push('/')}
      userId={userId || user?.id || ''}
      forceComplete={forceSetup}
    />
  );
}

// Wrap in Suspense for useSearchParams
export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Loading setup...</p>
        </div>
      </div>
    }>
      <SetupPageContent />
    </Suspense>
  );
} 