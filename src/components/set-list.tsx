'use client';

import { useWorkout } from '@/lib/workout-context';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { WorkoutHistory } from './workout-history';
import { Trash2 } from 'lucide-react';

interface SetListProps {
  exerciseName: string;
}

export function SetList({ exerciseName }: SetListProps) {
  const { getSetsForExercise, removeSetFromExercise } = useWorkout();
  const sets = getSetsForExercise(exerciseName);

  if (sets.length === 0) {
    return null;
  }

  // Get only the last set
  const lastSet = sets[sets.length - 1];

  return (
    <div className="mt-10">
      <div className="flex items-center mb-4">
        <h3 className="text-xl font-medium text-white/80">Last Set</h3>
        <WorkoutHistory exerciseName={exerciseName} />
      </div>
      <div className="border-2 border-white/20 rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm shadow-inner shadow-white/5">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-white/20 hover:bg-transparent">
              <TableHead className="text-white/70 font-medium text-sm">Warmup</TableHead>
              <TableHead className="text-white/70 font-medium text-sm">Weight (lbs)</TableHead>
              <TableHead className="text-white/70 font-medium text-sm">Reps</TableHead>
              <TableHead className="text-white/70 font-medium text-sm">Goal</TableHead>
              <TableHead className="text-white/70 font-medium text-sm w-[80px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow 
              className="border-b border-white/10 last:border-0 hover:bg-white/5"
            >
              <TableCell className="font-medium">{lastSet.warmup}</TableCell>
              <TableCell>{lastSet.weight}</TableCell>
              <TableCell>{lastSet.reps}</TableCell>
              <TableCell>{lastSet.goal}</TableCell>
              <TableCell>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => removeSetFromExercise(exerciseName, sets.length - 1)}
                  className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-black transition-colors p-2 h-8 w-8"
                >
                  <Trash2 size={16} />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 