'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Day, ExerciseSet, User, exercises as defaultExercises } from './types';
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
  users: User[];
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>('Mottu');
  const [selectedDay, setSelectedDay] = useState<Day>('Monday');
  const [exerciseSets, setExerciseSets] = useState<Record<string, ExerciseSet[]>>({});
  const [exercisesByDay, setExercisesByDay] = useState<Record<Day, string[]>>(defaultExercises as Record<Day, string[]>);
  const [users, setUsers] = useState<User[]>([]);

  // Fetch all users from the database
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, id')
        .order('id');
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const usernames = data.map(user => user.username);
        setUsers(usernames);
        
        // If current user doesn't exist in the list, set to the first user
        if (usernames.length > 0 && !usernames.includes(currentUser)) {
          setCurrentUser(usernames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [currentUser]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Subscribe to real-time changes in the users table
  useEffect(() => {
    const usersChannel = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('User change detected:', payload);
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, [fetchUsers]);

  // Fetch exercises for the current user and day
  const fetchExercisesForDay = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('name')
        .eq('username', currentUser)
        .eq('day', selectedDay)
        .order('position');
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Extract just the exercise names
        const exerciseNames = data.map(item => item.name);
        
        // Update the exercises for the current day
        setExercisesByDay(prev => ({
          ...prev,
          [selectedDay]: exerciseNames
        }));
      } else {
        // If no data, use defaults
        setExercisesByDay(prev => ({
          ...prev,
          [selectedDay]: defaultExercises[selectedDay] || []
        }));
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      // Fall back to defaults
      setExercisesByDay(prev => ({
        ...prev,
        [selectedDay]: defaultExercises[selectedDay] || []
      }));
    }
  }, [currentUser, selectedDay]);

  // Subscribe to real-time changes in exercises table
  useEffect(() => {
    const exercisesChannel = supabase
      .channel('exercises_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercises'
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          // Only refresh if the change affects the current user and day
          const record = payload.new || payload.old;
          if (record && record.username === currentUser && record.day === selectedDay) {
            fetchExercisesForDay();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(exercisesChannel);
    };
  }, [currentUser, selectedDay, fetchExercisesForDay]);

  // Initial fetch of exercises when user or day changes
  useEffect(() => {
    fetchExercisesForDay();
  }, [fetchExercisesForDay]);

  // Subscribe to real-time changes in sets
  useEffect(() => {
    const setsChannel = supabase
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
          const dayExercises = exercisesByDay[selectedDay] || [];
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
      supabase.removeChannel(setsChannel);
    };
  }, [currentUser, selectedDay, exercisesByDay]);

  // Initialize or update exerciseSets when user or day changes
  useEffect(() => {
    const fetchSets = async () => {
      const dayExercises = exercisesByDay[selectedDay] || [];
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
  }, [currentUser, selectedDay, exercisesByDay]);

  const getSetsForExercise = (exerciseName: string) => {
    return exerciseSets[exerciseName] || [];
  };

  const addSetToExercise = async (exerciseName: string, set: ExerciseSet) => {
    const { error } = await supabase
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
        exercisesForSelectedDay: exercisesByDay[selectedDay] || [],
        users,
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