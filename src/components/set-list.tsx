'use client';

import { useState } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { useAuth } from '@/lib/auth-context';
import { LoginPrompt } from './login-prompt';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface SetListProps {
  exerciseName: string;
}

export function SetList({ exerciseName }: SetListProps) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { getSetsForExercise, removeSetFromExercise } = useWorkout();
  const { user } = useAuth();
  const sets = getSetsForExercise(exerciseName);

  const handleDelete = (index: number) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    removeSetFromExercise(exerciseName, index);
  };

  if (sets.length === 0) {
    return (
      <div className="text-center text-white/50 py-8">
        No sets logged yet
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-5 gap-4 text-sm font-medium text-white/70 pb-2 border-b border-white/10">
          <div>Warmup</div>
          <div>Weight</div>
          <div>Reps</div>
          <div>Goal</div>
          <div className="text-right">Actions</div>
        </div>
        {sets.map((set, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 items-center py-2">
            <div className="text-white">{set.warmup}</div>
            <div className="text-white">{set.weight}</div>
            <div className="text-white">{set.reps}</div>
            <div className="text-white">{set.goal}</div>
            <div className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(index)}
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please sign in to delete workout sets"
      />
    </>
  );
} 