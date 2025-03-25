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
  removeUserFromState: (username: string) => void;
}

const WorkoutContext = createContext<WorkoutContextProps | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<Day>('Monday');
  const [exerciseSets, setExerciseSets] = useState<Record<string, ExerciseSet[]>>({});
  const [exercisesByDay, setExercisesByDay] = useState<Record<Day, string[]>>(defaultExercises);
  const [users, setUsers] = useState<string[]>([]);
  const { user: authUser } = useAuth();

  // Enhanced setCurrentUser that handles the case where a user is deleted
  const setCurrentUser = useCallback((user: string) => {
    // Only update if the user is different from current user to prevent unnecessary updates
    if (user !== currentUser) {
      // If the user exists in the users array, set it as current
      // Otherwise, select the first available user as fallback
      if (users.includes(user)) {
        setCurrentUserState(user);
      } else if (users.length > 0) {
        setCurrentUserState(users[0]);
      }
    }
  }, [users, currentUser]);
  
  // Function to remove a user from the local state (used for UI updates)
  const removeUserFromState = useCallback((username: string) => {
    // Store the filtered users to avoid recalculation
    const remainingUsers = users.filter(u => u !== username);
    setUsers(remainingUsers);
    
    // If the current user is removed, switch to another user
    if (currentUser === username && remainingUsers.length > 0) {
      // Use the first remaining user directly instead of searching again
      setCurrentUserState(remainingUsers[0]);
    }
  }, [currentUser, users]);

  // Update current user if it's not in the users list
  useEffect(() => {
    // Only update if we have users and the current user is not in the list
    // Add an additional check for non-empty currentUser to avoid unnecessary updates
    if (users.length > 0 && currentUser && !users.includes(currentUser)) {
      setCurrentUserState(users[0]); // Use setCurrentUserState instead of setCurrentUser to avoid cycles
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]); // Removed currentUser from dependencies to avoid potential loops

  // Function to fetch users
  const fetchUsers = useCallback(async () => {
    if (!authUser) {
      // Set to default names for non-authenticated users
      setUsers(['Name 1', 'Name 2']);
      return;
    }

    try {
      // Get profile information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, has_buddy, buddy_name')
        .eq('id', authUser.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Get users owned by the current auth user
      const { data: ownedUsers, error: usersError } = await supabase
        .from('users')
        .select('username')
        .eq('auth_id', authUser.id);
        
      if (usersError) throw usersError;
      
      let usersList = ownedUsers.map(u => u.username);
      
      // Make sure the main user (display name) is in the list
      if (profileData && profileData.display_name && !usersList.includes(profileData.display_name)) {
        usersList.push(profileData.display_name);
      }
      
      // If user has a buddy, make sure it's in the list
      if (profileData && profileData.has_buddy && profileData.buddy_name && !usersList.includes(profileData.buddy_name)) {
        usersList.push(profileData.buddy_name);
      }
      
      // Also check workout_buddies table for any other buddies
      const { data: buddies, error: buddiesError } = await supabase
        .from('workout_buddies')
        .select('buddy_name')
        .eq('profile_id', authUser.id);
        
      if (!buddiesError && buddies) {
        for (const buddy of buddies) {
          if (buddy.buddy_name && !usersList.includes(buddy.buddy_name)) {
            usersList.push(buddy.buddy_name);
          }
        }
      }
      
      // Remove duplicates just to be sure
      usersList = [...new Set(usersList)];
      
      // Sort alphabetically
      setUsers(usersList.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers(['Name 1', 'Name 2']);
    }
  }, [authUser]);

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
              
              // Fetch users separately
              await fetchUsers();

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
          
          // Fetch users separately
          await fetchUsers();

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, fetchUsers]); // Removed setCurrentUser from dependencies to prevent infinite loops

  // Subscribe to real-time changes in users and profiles tables
  useEffect(() => {
    if (!authUser) return;

    // Subscribe to users table
    const usersChannel = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen for all events (insert, update, delete)
          schema: 'public',
          table: 'users',
          filter: `auth_id=eq.${authUser.id}`  // Only listen to changes for this user
        },
        () => {
          // Refresh users when changes occur
          fetchUsers();
        }
      )
      .subscribe();
      
    // Subscribe to profiles table for buddy changes
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${authUser.id}`  // Only listen to changes for this user's profile
        },
        () => {
          // Refresh users when profile changes (buddy added/removed)
          fetchUsers();
        }
      )
      .subscribe();
      
    // Subscribe to workout_buddies table as well
    const buddiesChannel = supabase
      .channel('buddies_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_buddies',
          filter: `profile_id=eq.${authUser.id}`  // Only listen to changes for this user's buddies
        },
        (payload) => {
          console.log('Buddy change detected:', payload);
          // Refresh users when buddies change
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(buddiesChannel);
    };
  }, [authUser, fetchUsers]);

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
        removeUserFromState,
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
  return {
    ...context,
    removeUserFromState: context.removeUserFromState
  };
} 