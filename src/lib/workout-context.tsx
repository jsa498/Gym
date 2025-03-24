'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Day, ExerciseSet, exercises as defaultExercises } from './types';
import { supabase, applyDatabaseFixes } from './supabase';
import { useAuth } from './auth-context';

interface WorkoutContextProps {
  currentUser: string;
  setCurrentUser: (user: string) => void;
  selectedDay: Day;
  setSelectedDay: (day: Day) => void;
  getSetsForExercise: (exerciseName: string) => ExerciseSet[];
  addSetToExercise: (exerciseName: string, set: ExerciseSet) => void;
  removeSetFromExercise: (exerciseName: string, index: number) => void;
  exercisesForSelectedDay: string[];
  users: string[];
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<Day>('Monday');
  const [exerciseSets, setExerciseSets] = useState<Record<string, ExerciseSet[]>>({});
  const [exercisesByDay, setExercisesByDay] = useState<Record<Day, string[]>>(defaultExercises);
  const [users, setUsers] = useState<string[]>([]);
  const { user: authUser } = useAuth();

  // Fetch user profile and buddy info when authenticated
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) {
        // Set to default names for non-authenticated users
        setCurrentUser('Name 1');
        setUsers(['Name 1', 'Name 2']);
        return;
      }

      try {
        // Ensure database is fixed
        await applyDatabaseFixes();
        
        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, has_buddy, buddy_name')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          // If profile doesn't exist, create it
          if (profileError.code === 'PGRST116') {
            console.log('Profile not found, creating one...');
            const { data: userData } = await supabase.auth.getUser();
            const displayName = userData?.user?.email?.split('@')[0] || 'User';
            
            await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                display_name: displayName,
                has_buddy: false,
                buddy_name: null,
                template_preference: null
              });
              
            // Try again after creating
            const { data: newProfile, error: newProfileError } = await supabase
              .from('profiles')
              .select('display_name, has_buddy, buddy_name')
              .eq('id', authUser.id)
              .single();
              
            if (newProfileError) throw newProfileError;
            
            // Use the newly created profile
            if (newProfile) {
              setCurrentUser(newProfile.display_name);
              
              // Get users owned by the current auth user
              const { data: ownedUsers, error: usersError } = await supabase
                .from('users')
                .select('username')
                .eq('auth_id', authUser.id);
                
              if (usersError) throw usersError;
              
              const usersList = ownedUsers.map(u => u.username);
              
              // If user has a buddy, use both names
              if (newProfile.has_buddy && newProfile.buddy_name && !usersList.includes(newProfile.buddy_name)) {
                usersList.push(newProfile.buddy_name);
              }
              
              setUsers(usersList);

              // Get user's workout days
              const { data: userDays, error: daysError } = await supabase
                .from('user_days')
                .select('day')
                .eq('auth_id', authUser.id)
                .eq('username', newProfile.display_name)
                .order('day_order');

              if (daysError) throw daysError;

              if (userDays && userDays.length > 0) {
                // Set the first day as selected
                setSelectedDay(userDays[0].day as Day);
              }
            }
          } else {
            throw profileError;
          }
        } else if (profileData) {
          setCurrentUser(profileData.display_name);
          
          // Get users owned by the current auth user
          const { data: ownedUsers, error: usersError } = await supabase
            .from('users')
            .select('username')
            .eq('auth_id', authUser.id);
            
          if (usersError) throw usersError;
          
          const usersList = ownedUsers.map(u => u.username);
          
          // If user has a buddy, use both names
          if (profileData.has_buddy && profileData.buddy_name && !usersList.includes(profileData.buddy_name)) {
            usersList.push(profileData.buddy_name);
          }
          
          setUsers(usersList);

          // Get user's workout days
          const { data: userDays, error: daysError } = await supabase
            .from('user_days')
            .select('day')
            .eq('auth_id', authUser.id)
            .eq('username', profileData.display_name)
            .order('day_order');

          if (daysError) throw daysError;

          if (userDays && userDays.length > 0) {
            // Set the first day as selected
            setSelectedDay(userDays[0].day as Day);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to defaults if there's an error
        setCurrentUser('Name 1');
        setUsers(['Name 1', 'Name 2']);
      }
    };

    fetchUserProfile();
  }, [authUser]);

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