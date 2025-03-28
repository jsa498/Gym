'use client';

import React, { useState, useEffect } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { SparklesIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SubscriptionStatus() {
  const { subscriptionPlan, userDayCount, maxWorkoutDays } = useWorkout();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  // Only render on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) return null;
  
  const isFreePlan = subscriptionPlan === 'free';
  const isPlusPlan = subscriptionPlan === 'plus';
  const isProPlan = subscriptionPlan === 'pro';

  const goToSubscriptionPage = () => {
    router.push('/settings/subscription');
  };

  return (
    <div 
      className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 text-xs font-medium cursor-pointer transition-colors ${
        isFreePlan 
          ? 'bg-white/10 text-white/70 hover:bg-white/20' 
          : isPlusPlan 
            ? 'bg-white/20 text-white hover:bg-white/30' 
            : 'bg-white/20 text-white hover:bg-white/30'
      }`}
      onClick={goToSubscriptionPage}
    >
      <SparklesIcon className="w-3 h-3" />
      <span>
        {isFreePlan && 'Free Plan'}
        {isPlusPlan && 'Plus Plan'}
        {isProPlan && 'Pro Plan'}
      </span>
      {isFreePlan && (
        <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] text-white">
          {userDayCount}/{maxWorkoutDays}
        </span>
      )}
    </div>
  );
}