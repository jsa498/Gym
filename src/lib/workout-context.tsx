'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Day, ExerciseSet, User, exercises } from './types';
import { supabase } from './supabase';

interface WorkoutContextProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  selectedDay: Day;
  setSelectedDay: (day: Day) => void;
  getSetsForExercise: (exerciseName: string) => ExerciseSet[];
  addSetToExercise: (exerciseName: string, set: ExerciseSet) => void;
  removeSetFromExercise: (exerciseName: string, index: number) => void;
  exercisesForSelectedDay: string[];
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>('Mottu');
  const [selectedDay, setSelectedDay] = useState<Day>('Monday');
  const [exerciseSets, setExerciseSets] = useState<Record<string, ExerciseSet[]>>({});

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('workout_sets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_sets'
        },
        async () => {
          // Refresh data when changes occur
          const dayExercises = exercises[selectedDay] || [];
          const newExerciseSets: Record<string, ExerciseSet[]> = {};
          
          for (const exercise of dayExercises) {
            const { data } = await supabase
              .from('workout_sets')
              .select('*')
              .eq('username', currentUser)
              .eq('exercise', exercise)
              .order('created_at', { ascending: true });
              
            newExerciseSets[exercise] = data?.map(set => ({
              warmup: set.warmup,
              weight: set.weight,
              reps: set.reps,
              goal: set.goal
            })) || [];
          }
          
          setExerciseSets(newExerciseSets);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedDay]);

  // Initialize or update exerciseSets when user or day changes
  useEffect(() => {
    const fetchSets = async () => {
      const dayExercises = exercises[selectedDay] || [];
      const newExerciseSets: Record<string, ExerciseSet[]> = {};
      
      for (const exercise of dayExercises) {
        const { data } = await supabase
          .from('workout_sets')
          .select('*')
          .eq('username', currentUser)
          .eq('exercise', exercise)
          .order('created_at', { ascending: true });
          
        newExerciseSets[exercise] = data?.map(set => ({
          warmup: set.warmup,
          weight: set.weight,
          reps: set.reps,
          goal: set.goal
        })) || [];
      }
      
      setExerciseSets(newExerciseSets);
    };

    fetchSets();
  }, [currentUser, selectedDay]);

  const getSetsForExercise = (exerciseName: string) => {
    return exerciseSets[exerciseName] || [];
  };

  const addSetToExercise = async (exerciseName: string, set: ExerciseSet) => {
    const { data, error } = await supabase
      .from('workout_sets')
      .insert([
        {
          username: currentUser,
          exercise: exerciseName,
          ...set
        }
      ]);

    if (error) {
      console.error('Error adding set:', error);
    }
  };

  const removeSetFromExercise = async (exerciseName: string, index: number) => {
    const sets = exerciseSets[exerciseName] || [];
    if (index >= 0 && index < sets.length) {
      const { data } = await supabase
        .from('workout_sets')
        .select('id')
        .eq('username', currentUser)
        .eq('exercise', exerciseName)
        .order('created_at', { ascending: true });

      if (data && data[index]) {
        const { error } = await supabase
          .from('workout_sets')
          .delete()
          .eq('id', data[index].id);

        if (error) {
          console.error('Error removing set:', error);
        }
      }
    }
  };

  return (
    <WorkoutContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        selectedDay,
        setSelectedDay,
        getSetsForExercise,
        addSetToExercise,
        removeSetFromExercise,
        exercisesForSelectedDay: exercises[selectedDay] || [],
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
} 