'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { useAuth } from '@/lib/auth-context';
import { LoginPrompt } from './login-prompt';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SetListProps {
  exerciseName: string;
}

interface WorkoutSetWithTimestamp {
  id: string;
  created_at: string;
  username: string;
  exercise: string;
  warmup: string;
  weight: string;
  reps: string;
  goal: string;
}

export function SetList({ exerciseName }: SetListProps) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { getSetsForExercise, removeSetFromExercise, currentUser } = useWorkout();
  const { user } = useAuth();
  const sets = getSetsForExercise(exerciseName);
  const [historyWithDates, setHistoryWithDates] = useState<WorkoutSetWithTimestamp[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const handleDelete = (index: number) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    removeSetFromExercise(exerciseName, index);
  };

  // Format date from timestamp
  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Load history data with timestamps
  const loadHistoryWithDates = useCallback(async () => {
    if (!user) return;
    
    setIsHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('username', currentUser)
        .eq('exercise', exerciseName)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setHistoryWithDates(data || []);
    } catch (error) {
      console.error('Error loading workout history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user, currentUser, exerciseName]);

  // Load history data with timestamps when the dialog opens
  useEffect(() => {
    if (historyOpen) {
      loadHistoryWithDates();
    }
  }, [historyOpen, loadHistoryWithDates]);

  // Handle delete from history
  const handleHistoryDelete = async (setId: string) => {
    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      // Refresh the history after deletion
      loadHistoryWithDates();
    } catch (error) {
      console.error('Error deleting workout set:', error);
    }
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
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-white/20 hover:bg-transparent">
                <TableHead className="text-white/70 font-medium text-sm">Warmup</TableHead>
                <TableHead className="text-white/70 font-medium text-sm">Weight (lbs)</TableHead>
                <TableHead className="text-white/70 font-medium text-sm">Reps</TableHead>
                <TableHead className="text-white/70 font-medium text-sm">Goal</TableHead>
                <TableHead className="text-white/70 font-medium text-sm w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b border-white/10 last:border-0 hover:bg-white/5">
                <TableCell className="font-medium">{lastSet.warmup}</TableCell>
                <TableCell>{lastSet.weight}</TableCell>
                <TableCell>{lastSet.reps}</TableCell>
                <TableCell>{lastSet.goal}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(sets.length - 1)}
                    className="h-8 w-8 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-black/95 border-white/20 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-center">{exerciseName} History</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-1">
            {isHistoryLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse text-white/70">Loading...</div>
              </div>
            ) : historyWithDates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/30 bg-black/50 hover:bg-black/50">
                    <TableHead className="text-white/70 font-medium text-sm">Date</TableHead>
                    <TableHead className="text-white/70 font-medium text-sm">Weight (lbs)</TableHead>
                    <TableHead className="text-white/70 font-medium text-sm">Reps</TableHead>
                    <TableHead className="text-white/70 font-medium text-sm">Goal</TableHead>
                    <TableHead className="text-white/70 font-medium text-sm text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyWithDates.map((set) => (
                    <TableRow key={set.id} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{formatDate(set.created_at)}</TableCell>
                      <TableCell className="text-white">{set.weight}</TableCell>
                      <TableCell className="text-white">{set.reps}</TableCell>
                      <TableCell className="text-white">{set.goal}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleHistoryDelete(set.id)}
                          className="h-8 w-8 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-white/70">
                No history available for this exercise.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please sign in to manage sets"
      />
    </>
  );
} 