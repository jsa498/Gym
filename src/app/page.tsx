'use client';

import { UserSelector } from '@/components/user-selector';
import { DaySelector } from '@/components/day-selector';
import { ExerciseAccordion } from '@/components/exercise-accordion';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <UserSelector />
          <DaySelector />
          <ExerciseAccordion />
        </div>
      </div>
    </main>
  );
}
