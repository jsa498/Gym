'use client';

import { UserSelector } from '@/components/user-selector';
import { DaySelector } from '@/components/day-selector';
import { ExerciseAccordion } from '@/components/exercise-accordion';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className={`max-w-3xl mx-auto px-4 py-12 ${isMobile ? 'pl-4' : 'pl-24'} sm:pl-24`}>
        <div className="space-y-8">
          <UserSelector />
          <DaySelector />
          <ExerciseAccordion />
        </div>
      </div>
    </main>
  );
}
