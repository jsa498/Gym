'use client';

import { UserSelector } from '@/components/user-selector';
import { DaySelector } from '@/components/day-selector';
import { ExerciseAccordion } from '@/components/exercise-accordion';
import { SubscriptionStatus } from '@/components/subscription-status';
import React, { useEffect, useState } from 'react';

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Use a debounced resize handler to avoid excessive re-renders
    let timeoutId: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        checkIfMobile();
      }, 100);
    };
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Memoize child components to prevent unnecessary re-renders
  const userSelector = React.useMemo(() => <UserSelector />, []);
  const daySelector = React.useMemo(() => <DaySelector />, []);
  const exerciseAccordion = React.useMemo(() => <ExerciseAccordion />, []);
  const subscriptionStatus = React.useMemo(() => <SubscriptionStatus />, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className={`fixed top-4 right-4 z-30 ${isMobile ? 'right-4' : 'right-6'}`}>
        {subscriptionStatus}
      </div>
      <div className={`max-w-3xl mx-auto px-4 py-12 ${isMobile ? 'pl-4' : 'pl-24'} sm:pl-24`}>
        <div className="space-y-8">
          {userSelector}
          {daySelector}
          {exerciseAccordion}
        </div>
      </div>
    </main>
  );
}
