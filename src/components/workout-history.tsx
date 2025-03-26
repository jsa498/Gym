'use client';

import { useState } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Trash2 } from 'lucide-react';

interface WorkoutHistoryProps {
  exerciseName: string;
}

interface WorkoutSet {
  id: string;
  created_at: string;
  username: string;
  exercise: string;
  warmup: string;
  weight: string;
  reps: string;
  goal: string;
}

export function WorkoutHistory({ exerciseName }: WorkoutHistoryProps) {
  const { currentUser } = useWorkout();
  const [history, setHistory] = useState<WorkoutSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load history when dialog opens
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('username', currentUser)
        .eq('exercise', exerciseName)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading workout history:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format date from ISO string to just month and date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleDelete = async (setId: string) => {
    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      // Refresh the history after deletion
      loadHistory();
    } catch (error) {
      console.error('Error deleting workout set:', error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="ml-2 border-white/20 bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
          onClick={() => loadHistory()}
        >
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">{exerciseName} History</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-pulse text-white/70">Loading...</div>
          </div>
        ) : history.length > 0 ? (
          <div className="mt-4">
            <div className="border border-white/20 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/30 bg-black/50 hover:bg-black/50">
                    <TableHead className="text-white font-medium text-sm">Date</TableHead>
                    <TableHead className="text-white font-medium text-sm">Weight (lbs)</TableHead>
                    <TableHead className="text-white font-medium text-sm">Reps</TableHead>
                    <TableHead className="text-white font-medium text-sm">Goal</TableHead>
                    <TableHead className="text-white font-medium text-sm text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((set) => (
                    <TableRow 
                      key={set.id} 
                      className="border-b border-white/10 last:border-0 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">{formatDate(set.created_at)}</TableCell>
                      <TableCell className="text-white">{set.weight}</TableCell>
                      <TableCell className="text-white">{set.reps}</TableCell>
                      <TableCell className="text-white">{set.goal}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(set.id)}
                          className="h-8 w-8 rounded-full bg-black/30 text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-white/70">
            No history available for this exercise.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 