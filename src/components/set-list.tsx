'use client';

import { useState } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { useAuth } from '@/lib/auth-context';
import { LoginPrompt } from './login-prompt';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SetListProps {
  exerciseName: string;
}

export function SetList({ exerciseName }: SetListProps) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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

  // Get the last (most recent) set
  const lastSet = sets[sets.length - 1];

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-medium text-white">Last Set</div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setHistoryOpen(true)}
            className="bg-black/50 text-white hover:bg-white/20 text-sm"
          >
            History
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 gap-4 bg-black/30 p-4 text-white">
            <div>
              <div className="text-sm text-white/60 mb-1">Warmup</div>
              <div className="font-medium">{lastSet.warmup}</div>
            </div>
            <div>
              <div className="text-sm text-white/60 mb-1">Weight (lbs)</div>
              <div className="font-medium">{lastSet.weight}</div>
            </div>
            <div>
              <div className="text-sm text-white/60 mb-1">Reps</div>
              <div className="font-medium">{lastSet.reps}</div>
            </div>
            <div>
              <div className="text-sm text-white/60 mb-1">Goal</div>
              <div className="font-medium">{lastSet.goal}</div>
            </div>
          </div>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-black/95 border-white/20 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-center">{exerciseName} History</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-white/70 pb-2 border-b border-white/10">
              <div>Warmup</div>
              <div>Weight</div>
              <div>Reps</div>
              <div>Goal</div>
              <div className="text-right">Action</div>
            </div>
            {[...sets].reverse().map((set, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 items-center py-2 border-b border-white/10">
                <div className="text-white">{set.warmup}</div>
                <div className="text-white">{set.weight}</div>
                <div className="text-white">{set.reps}</div>
                <div className="text-white">{set.goal}</div>
                <div className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(sets.length - 1 - index)}
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please sign in to delete workout sets"
      />
    </>
  );
} 