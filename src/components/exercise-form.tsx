'use client';

import { useState, useEffect } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { ExerciseSet } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ExerciseFormProps {
  exerciseName: string;
}

export function ExerciseForm({ exerciseName }: ExerciseFormProps) {
  const { addSetToExercise, getSetsForExercise } = useWorkout();
  const [form, setForm] = useState<ExerciseSet>({
    warmup: '',
    weight: '',
    reps: '',
    goal: ''
  });

  // Load the last set to prefill specific form fields (excluding reps)
  useEffect(() => {
    // Get sets from the workout context instead of localStorage
    const sets = getSetsForExercise(exerciseName);
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : null;
    
    if (lastSet) {
      setForm({
        warmup: lastSet.warmup,
        weight: lastSet.weight,
        reps: '', // Don't prefill reps as requested
        goal: lastSet.goal
      });
    }
  }, [exerciseName, getSetsForExercise]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    addSetToExercise(exerciseName, form);
    // Don't reset the form to make it easier to log similar sets
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6 bg-black/20 p-6 rounded-xl border border-white/10 shadow-inner shadow-white/5">
      <div className="space-y-2">
        <Label htmlFor="warmup" className="text-white/80 text-sm font-medium">
          Warm-up sets
        </Label>
        <Input
          id="warmup"
          name="warmup"
          value={form.warmup}
          onChange={handleChange}
          placeholder="e.g., 1, 2, ..."
          className="h-12 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 transition-colors text-white placeholder:text-white/50 rounded-lg"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="weight" className="text-white/80 text-sm font-medium">
          Weight (lbs)
        </Label>
        <Input
          id="weight"
          name="weight"
          type="number"
          value={form.weight}
          onChange={handleChange}
          placeholder="e.g., 135"
          className="h-12 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 transition-colors text-white placeholder:text-white/50 rounded-lg"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="reps" className="text-white/80 text-sm font-medium">
          Reps
        </Label>
        <Input
          id="reps"
          name="reps"
          type="number"
          value={form.reps}
          onChange={handleChange}
          placeholder="e.g., 8"
          className="h-12 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 transition-colors text-white placeholder:text-white/50 rounded-lg"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="goal" className="text-white/80 text-sm font-medium">
          Goal
        </Label>
        <Input
          id="goal"
          name="goal"
          value={form.goal}
          onChange={handleChange}
          placeholder="e.g., 12-20 reps"
          className="h-12 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 transition-colors text-white placeholder:text-white/50 rounded-lg"
        />
      </div>
      
      <Button 
        type="submit" 
        className="col-span-2 h-12 bg-white text-black hover:bg-white/90 transition-colors text-lg font-medium shadow-lg shadow-black/20 hover:shadow-black/30"
      >
        Log Set
      </Button>
    </form>
  );
} 