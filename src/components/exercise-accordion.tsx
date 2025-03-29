'use client';

import { useWorkout } from '@/lib/workout-context';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { ExerciseForm } from './exercise-form';
import { SetList } from './set-list';

export function ExerciseAccordion() {
  const { exercisesForSelectedDay, selectedDay, currentUser } = useWorkout();

  return (
    <div className="mt-12 mb-16 pb-8">
      <h2 className="text-3xl font-bold mb-8 text-center tracking-tight">
        {selectedDay}&apos;s FitBull Workout for {currentUser}
      </h2>
      <Accordion type="single" collapsible className="w-full space-y-6">
        {exercisesForSelectedDay.map((exercise, index) => (
          <AccordionItem 
            key={exercise} 
            value={`item-${index}`}
            className="border-2 border-white/20 px-6 rounded-xl overflow-hidden shadow-lg shadow-black/10 hover:shadow-black/20 transition-all"
          >
            <AccordionTrigger className="text-xl font-medium py-6 hover:no-underline hover:bg-white/5 transition-colors">
              {exercise}
            </AccordionTrigger>
            <AccordionContent className="pb-8">
              <ExerciseForm exerciseName={exercise} />
              <SetList exerciseName={exercise} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
} 