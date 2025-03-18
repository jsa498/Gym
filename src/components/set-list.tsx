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

interface SetListProps {
  exerciseName: string;
}

export function SetList({ exerciseName }: SetListProps) {
  const { getSetsForExercise, removeSetFromExercise } = useWorkout();
  const sets = getSetsForExercise(exerciseName);

  if (sets.length === 0) {
    return null;
  }

  return (
    <div className="mt-10">
      <h3 className="text-xl font-medium mb-4 text-white/80">Logged Sets</h3>
      <div className="border-2 border-white/20 rounded-xl overflow-hidden bg-black/30 backdrop-blur-sm shadow-inner shadow-white/5">
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
            {sets.map((set, index) => (
              <TableRow 
                key={index} 
                className="border-b border-white/10 last:border-0 hover:bg-white/5"
              >
                <TableCell className="font-medium">{set.warmup}</TableCell>
                <TableCell>{set.weight}</TableCell>
                <TableCell>{set.reps}</TableCell>
                <TableCell>{set.goal}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => removeSetFromExercise(exerciseName, index)}
                    className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 