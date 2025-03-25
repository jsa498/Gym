'use client';

import { useState, useEffect } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  User,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { exercises as defaultExercises, Day, ExercisesByDay, User as UserType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { LoginPrompt } from './login-prompt';

// Type for exercise insert
interface ExerciseInsert {
  username: string;
  day: string;
  name: string;
  position: number;
}

export function WorkoutManagement() {
  const { selectedDay, currentUser, setCurrentUser } = useWorkout();
  const { user: authUser } = useAuth();
  const [workoutDays, setWorkoutDays] = useState<Day[]>(
    currentUser === 'Babli' 
      ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
      : ['Monday', 'Wednesday', 'Thursday']
  );
  const [selectedDayForEdit, setSelectedDayForEdit] = useState<Day>(selectedDay);
  const [workoutExercises, setWorkoutExercises] = useState<ExercisesByDay>(defaultExercises);
  const [newExerciseInputs, setNewExerciseInputs] = useState<{[key in Day]?: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState<{[key in Day]?: boolean}>({
    [selectedDay]: true // Start with selected day expanded
  });
  const [availableUsers, setAvailableUsers] = useState<string[]>(['Mottu', 'Babli']);
  const [selectedUser, setSelectedUser] = useState<UserType>(currentUser);
  const [dataLoading, setDataLoading] = useState(false);
  const [availableDays, setAvailableDays] = useState<Day[]>(
    currentUser === 'Babli' 
      ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
      : ['Monday', 'Wednesday', 'Thursday']
  );
  const [selectedDays, setSelectedDays] = useState<Day[]>([]);
  const [dayManagementOpen, setDayManagementOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Dialog states
  const [removeExerciseDialogOpen, setRemoveExerciseDialogOpen] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<{day: Day, index: number, name: string} | null>(null);
  const [removeDayDialogOpen, setRemoveDayDialogOpen] = useState(false);
  const [dayToRemove, setDayToRemove] = useState<Day | null>(null);
  const [addDayDialogOpen, setAddDayDialogOpen] = useState(false);

  // Prefetch exercises for both users when component mounts
  useEffect(() => {
    const prefetchData = async () => {
      // Prefetch for current user
      await fetchUserExercises(currentUser);
      
      // If not loaded completely yet, mark as complete
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    };
    
    prefetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available users in background
  useEffect(() => {
    const fetchUsers = async () => {
      if (!authUser) {
        setAvailableUsers(['Name 1', 'Name 2']);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('auth_id', authUser.id)
        .order('username');

      if (!error && data) {
        const usernames = data.map(user => user.username);
        
        // Also get buddy name if exists
        const { data: profileData } = await supabase
          .from('profiles')
          .select('buddy_name, has_buddy')
          .eq('id', authUser.id)
          .single();
          
        if (profileData && profileData.has_buddy && profileData.buddy_name) {
          if (!usernames.includes(profileData.buddy_name)) {
            usernames.push(profileData.buddy_name);
          }
        }
        
        setAvailableUsers(usernames.sort((a, b) => a.localeCompare(b)));
      }
    };

    fetchUsers();
  }, [authUser]);

  // Extract fetchUserExercises to a reusable function
  const fetchUserExercises = async (user: UserType) => {
    try {
      // No timeout needed - we're using optimistic updates
      
      // First fetch all exercises for the user from the database
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('username', user)
        .order('position');
      
      if (error) throw error;
      
      // If we have exercises for this user in the database, use them
      if (data && data.length > 0) {
        // Create a new ExercisesByDay object with the correct structure
        const userExercises: ExercisesByDay = {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: []
        };
        
        // Fill in exercises from database
        data.forEach(exercise => {
          if (userExercises[exercise.day as Day]) {
            userExercises[exercise.day as Day].push(exercise.name);
          }
        });
        
        if (user === selectedUser) {
          setWorkoutExercises(userExercises);
        }
        
        return userExercises;
      } else {
        // If no exercises yet for this user, initialize with default exercises
        if (user === selectedUser) {
          setWorkoutExercises(defaultExercises);
        }
        
        // Initialize the database with default exercises for this user in background
        const currentDays = user === 'Babli' 
          ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
          : ['Monday', 'Wednesday', 'Thursday'];
          
        const exercisesToInsert: ExerciseInsert[] = [];
        for (const day of currentDays) {
          const typedDay = day as Day;
          defaultExercises[typedDay].forEach((exercise: string, position: number) => {
            exercisesToInsert.push({
              username: user,
              day: day,
              name: exercise,
              position: position
            });
          });
        }
        
        // Only insert if there are exercises to insert
        if (exercisesToInsert.length > 0) {
          // Insert all default exercises for this user
          await supabase
            .from('exercises')
            .insert(exercisesToInsert);
        }
        
        return defaultExercises;
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      // Fallback to defaults
      return defaultExercises;
    }
  };

  // Fetch user exercises when user changes - but don't show loading state
  useEffect(() => {
    const loadUserData = async () => {
      // Only show loading if we haven't completed initial load
      if (!initialLoadComplete) {
        setDataLoading(true);
      }
      
      await fetchUserExercises(selectedUser);
      
      setDataLoading(false);
    };
    
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, initialLoadComplete]);

  // Fetch available days - optimized to avoid flashing
  useEffect(() => {
    const fetchUserDays = async () => {
      try {
        // No need for loading state or timeout - we're already showing data
        const { data, error } = await supabase
          .from('user_days')
          .select('day, day_order')
          .eq('username', selectedUser)
          .order('day_order');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Extract the days and convert to Day type
          const days = data.map(item => item.day) as Day[];
          setAvailableDays(days);
          setWorkoutDays(days);
        } else {
          // Fallback to default days
          const defaultDays: Day[] = selectedUser === 'Babli' 
            ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
            : ['Monday', 'Wednesday', 'Thursday'];
          setAvailableDays(defaultDays);
          setWorkoutDays(defaultDays);
        }
      } catch (error) {
        console.error('Error fetching user days:', error);
      }
    };

    fetchUserDays();
  }, [selectedUser]);

  // Function to get day order
  const getDayOrder = (day: Day): number => {
    const dayOrder: Record<Day, number> = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };
    return dayOrder[day];
  };

  // Initialize expanded state
  useEffect(() => {
    const initialExpanded: {[key in Day]?: boolean} = {};
    workoutDays.forEach(day => {
      initialExpanded[day] = day === selectedDay;
    });
    setExpanded(initialExpanded);
  }, [selectedDay, workoutDays]);

  const toggleExpanded = (day: Day) => {
    // Stop event propagation to prevent interfering with sidebar
    setExpanded(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
    
    // If we're expanding this day, ensure it's the selected day for edit
    if (!expanded[day]) {
      setSelectedDayForEdit(day);
    }
  };

  const handleAddExercise = async (day: Day) => {
    if (!authUser) {
      setShowLoginPrompt(true);
      return;
    }

    const exerciseName = newExerciseInputs[day]?.trim();
    if (!exerciseName) return;
    
    setIsLoading(true);
    try {
      // Create a new array with the added exercise
      const dayExercises = [...workoutExercises[day]];
      const position = dayExercises.length; // Add to the end
      dayExercises.push(exerciseName);
      
      // Update local state immediately for responsive UI
      const updatedExercises = {
        ...workoutExercises,
        [day]: dayExercises
      };
      setWorkoutExercises(updatedExercises);
      
      // Add exercise to database
      const { error } = await supabase
        .from('exercises')
        .insert({
          username: selectedUser,
          day: day,
          name: exerciseName,
          position: position
        });
      
      if (error) throw error;
      
      // Clear the input field
      setNewExerciseInputs(prev => ({
        ...prev,
        [day]: ''
      }));
    } catch (error) {
      console.error('Error adding exercise:', error);
      alert('Failed to add exercise. Please try again.');
      
      // Restore original exercises if there was an error
      fetchUserExercises(selectedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const openRemoveExerciseDialog = (day: Day, index: number) => {
    // Check if user is logged in
    if (!authUser) {
      setShowLoginPrompt(true);
      return;
    }
    
    const exerciseName = workoutExercises[day][index];
    setExerciseToRemove({day, index, name: exerciseName});
    setRemoveExerciseDialogOpen(true);
  };

  const handleRemoveExercise = async () => {
    if (!exerciseToRemove) return;
    
    const {day, index, name} = exerciseToRemove;
    
    setIsLoading(true);
    try {
      // Create a new array without the removed exercise
      const dayExercises = [...workoutExercises[day]];
      dayExercises.splice(index, 1);
      
      const updatedExercises = {
        ...workoutExercises,
        [day]: dayExercises
      };
      
      // Update in database
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('username', selectedUser)
        .eq('day', day)
        .eq('name', name);
      
      if (error) throw error;
      
      // Update local state
      setWorkoutExercises(updatedExercises);
      
      // Close dialog
      setRemoveExerciseDialogOpen(false);
      setExerciseToRemove(null);
    } catch (error) {
      console.error('Error removing exercise:', error);
      alert('Failed to remove exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const moveExercise = async (day: Day, fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workoutExercises[day].length) return;
    
    // Check if user is logged in
    if (!authUser) {
      setShowLoginPrompt(true);
      return;
    }
    
    setIsLoading(true);
    try {
      // Create a new array with the reordered exercises
      const dayExercises = [...workoutExercises[day]];
      const [movedItem] = dayExercises.splice(fromIndex, 1);
      dayExercises.splice(toIndex, 0, movedItem);
      
      // Update local state immediately for responsive UI
      const updatedExercises = {
        ...workoutExercises,
        [day]: dayExercises
      };
      setWorkoutExercises(updatedExercises);
      
      // First, delete all exercises for this day to avoid conflicts
      await supabase
        .from('exercises')
        .delete()
        .eq('username', selectedUser)
        .eq('day', day);
        
      // Then insert all exercises with updated positions
      const exercisesToInsert = dayExercises.map((name, index) => ({
        username: selectedUser,
        day: day,
        name: name,
        position: index
      }));
      
      // Insert all exercises with new positions
      const { error } = await supabase
        .from('exercises')
        .insert(exercisesToInsert);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error moving exercise:', error);
      alert('Failed to move exercise. Please try again.');
      
      // Restore original order if there was an error
      fetchUserExercises(selectedUser);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle user change
  const handleUserChange = (user: UserType) => {
    // Update selected user immediately for a responsive UI
    setSelectedUser(user);
    setCurrentUser(user);
    
    // Clear all exercise inputs when switching users
    setNewExerciseInputs({});
    
    // Pre-populate with defaults for the selected user immediately
    const defaultDays: Day[] = user === 'Babli' 
      ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
      : ['Monday', 'Wednesday', 'Thursday'];
    setAvailableDays(defaultDays);
    setWorkoutDays(defaultDays);
  };

  // Add a new day
  const handleAddDay = async () => {
    if (!selectedDays.length) return;
    
    // Check if user is logged in
    if (!authUser) {
      setShowLoginPrompt(true);
      return;
    }
    
    setIsLoading(true);
    try {
      // Create array of day objects to insert
      const daysToInsert = selectedDays
        .filter(day => !availableDays.includes(day))
        .map(day => ({ 
          username: selectedUser, 
          day: day,
          day_order: getDayOrder(day)
        }));
      
      if (daysToInsert.length === 0) {
        setAddDayDialogOpen(false);
        return;
      }
      
      // Insert the new days in the database with order
      const { error } = await supabase
        .from('user_days')
        .insert(daysToInsert);
      
      if (error) throw error;
      
      // Update local state - add new days and sort by order
      const updatedDays = [...availableDays, ...selectedDays.filter(day => !availableDays.includes(day))]
        .sort((a, b) => getDayOrder(a as Day) - getDayOrder(b as Day));
      
      setAvailableDays(updatedDays as Day[]);
      setWorkoutDays(updatedDays as Day[]);
      
      // Initialize input state for new days
      const newInputs = {...newExerciseInputs};
      selectedDays.forEach(day => {
        if (!availableDays.includes(day)) {
          newInputs[day] = '';
        }
      });
      setNewExerciseInputs(newInputs);
      
      // Initialize exercises for the new days if needed
      const updatedExercises = {...workoutExercises};
      selectedDays.forEach(day => {
        if (!availableDays.includes(day) && (!updatedExercises[day] || updatedExercises[day].length === 0)) {
          updatedExercises[day] = [];
        }
      });
      setWorkoutExercises(updatedExercises);
      
      // Clear selected days and close the dialog
      setSelectedDays([]);
      setAddDayDialogOpen(false);
    } catch (error) {
      console.error('Error adding days:', error);
      alert('Failed to add days. Please try again.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Initialize with the first available day when opening dialog
    if (addDayDialogOpen) {
      const availableDaysToAdd = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        .filter(day => !availableDays.includes(day as Day)) as Day[];
      
      if (availableDaysToAdd.length > 0) {
        setSelectedDays([availableDaysToAdd[0]]);
      } else {
        setSelectedDays([]);
      }
    }
  }, [addDayDialogOpen, availableDays]);

  // Toggle day selection
  const toggleDaySelection = (day: Day) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const openRemoveDayDialog = (day: Day) => {
    setDayToRemove(day);
    setRemoveDayDialogOpen(true);
  };

  const handleRemoveDay = async () => {
    if (!dayToRemove) return;
    
    setIsLoading(true);
    try {
      // Delete the day from the database
      const { error: dayError } = await supabase
        .from('user_days')
        .delete()
        .eq('username', selectedUser)
        .eq('day', dayToRemove);
      
      if (dayError) throw dayError;
      
      // Delete all exercises for this day
      const { error: exerciseError } = await supabase
        .from('exercises')
        .delete()
        .eq('username', selectedUser)
        .eq('day', dayToRemove);
      
      if (exerciseError) throw exerciseError;
      
      // Update local state
      const updatedDays = availableDays.filter(d => d !== dayToRemove);
      setAvailableDays(updatedDays);
      setWorkoutDays(updatedDays);
      
      // Remove exercises for that day from local state
      const updatedExercises = { ...workoutExercises };
      delete updatedExercises[dayToRemove];
      setWorkoutExercises(updatedExercises);
      
      // Remove input state for the deleted day
      setNewExerciseInputs(prev => {
        const updated = { ...prev };
        delete updated[dayToRemove];
        return updated;
      });
      
      // Close dialog
      setRemoveDayDialogOpen(false);
      setDayToRemove(null);
    } catch (error) {
      console.error('Error removing day:', error);
      alert('Failed to remove day. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show skeleton if we've never loaded data and are still loading
  if (!initialLoadComplete && dataLoading) {
    return (
      <div className="space-y-4 p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">Manage Workouts</h2>
        
        {/* User selection - show actual buttons */}
        <div className="space-y-4">
          <Label className="text-white/80 text-sm font-medium block">
            Select User
          </Label>
          <div className="flex flex-col space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {availableUsers.map((user) => (
                <Button
                  key={user}
                  variant={user === selectedUser ? "default" : "outline"}
                  onClick={() => handleUserChange(user as UserType)}
                  className={user === selectedUser 
                    ? "bg-white text-black hover:bg-white/90 hover:text-black" 
                    : "border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
                  }
                >
                  <User className="h-4 w-4 mr-2" />
                  {user}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Days - show as skeletons */}
        <div className="mt-8 mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Workout Days</h3>
            <div className="h-8 w-20 bg-white/10 rounded-md animate-pulse"></div>
          </div>
        </div>
        
        {/* Exercise list skeletons - maintain same structure */}
        {workoutDays.map((day) => (
          <div key={day} className="border border-white/10 rounded-md overflow-hidden mb-4">
            <div className="bg-white/5 p-3 flex justify-between cursor-pointer">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 opacity-70" />
                <span className="font-medium text-white">{day}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-white" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">Manage Workouts</h2>
        
        {/* User Selection Section */}
        <div className="space-y-4">
          <Label className="text-white/80 text-sm font-medium block">
            Select User
          </Label>
          <div className="flex flex-col space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {availableUsers.map((user) => (
                <Button
                  key={user}
                  variant={user === selectedUser ? "default" : "outline"}
                  onClick={() => handleUserChange(user as UserType)}
                  className={user === selectedUser 
                    ? "bg-white text-black hover:bg-white/90 hover:text-black" 
                    : "border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
                  }
                >
                  <User className="h-4 w-4 mr-2" />
                  {user}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Day Management Section - Modified to be more compact */}
        <div className="mt-8 mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Workout Days</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!authUser) {
                  setShowLoginPrompt(true);
                  return;
                }
                setDayManagementOpen(!dayManagementOpen);
              }}
              className="bg-black/50 text-white hover:bg-white/20"
            >
              {dayManagementOpen ? 'Close' : 'Edit Days'}
            </Button>
          </div>
          
          {dayManagementOpen && (
            <div className="mt-4 p-4 border border-white/20 rounded-lg bg-black/50 backdrop-blur-sm">
              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">Current Workout Days</h4>
                <div className="flex flex-wrap gap-2">
                  {availableDays.map(day => (
                    <div key={day} className="flex items-center bg-white/10 rounded px-3 py-1">
                      <span className="text-white mr-2">{day}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRemoveDayDialog(day);
                        }}
                        className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-red-500/20"
                        disabled={availableDays.length <= 1 || isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="default" 
                onClick={(e) => {
                  e.stopPropagation();
                  setAddDayDialogOpen(true);
                }}
                className="bg-white hover:bg-white/90 text-black"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Day
              </Button>
            </div>
          )}
        </div>
        
        {/* Workout Management */}
        <div className="space-y-4">
          {workoutDays.map((day) => (
            <div key={day} className="border border-white/10 rounded-md overflow-hidden">
              <button
                className={`w-full flex items-center justify-between p-3 text-white ${
                  day === selectedDayForEdit 
                    ? "bg-white/20 hover:bg-white/25" 
                    : "bg-white/5 hover:bg-white/10"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(day);
                  setSelectedDayForEdit(day);
                }}
              >
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 opacity-70" />
                  <span className="font-medium">{day}</span>
                </div>
                {expanded[day] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {expanded[day] && (
                <div className="p-3 space-y-2">
                  {workoutExercises[day].length === 0 ? (
                    <div className="text-white/50 text-sm italic text-center py-2">
                      No exercises for this day
                    </div>
                  ) : (
                    workoutExercises[day].map((exercise, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <div className="flex-1 text-white">{exercise}</div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading || index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveExercise(day, index, index - 1);
                            }}
                            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading || index === workoutExercises[day].length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveExercise(day, index, index + 1);
                            }}
                            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              openRemoveExerciseDialog(day, index);
                            }}
                            className="h-7 w-7 text-white/70 hover:text-red-500 hover:bg-white/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Exercise input field appears only for the selected day */}
                  <div className="pt-3 mt-2 border-t border-white/10">
                    <div className="flex space-x-2">
                      <Input
                        value={newExerciseInputs[day] || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          setNewExerciseInputs(prev => ({
                            ...prev,
                            [day]: e.target.value
                          }));
                        }}
                        placeholder="New exercise name..."
                        className="flex-1 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 text-white placeholder:text-white/50 h-9"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading || !newExerciseInputs[day]?.trim()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddExercise(day);
                        }}
                        className="border-white/20 bg-white/10 text-white hover:bg-white/90 hover:text-black h-9"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={removeExerciseDialogOpen} onOpenChange={setRemoveExerciseDialogOpen}>
        <DialogContent className="bg-black/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Remove Exercise
              </div>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Are you sure you want to remove &quot;{exerciseToRemove?.name}&quot; from {exerciseToRemove?.day}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="ghost"
              onClick={() => setRemoveExerciseDialogOpen(false)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRemoveExercise}
              disabled={isLoading}
              className="bg-black border border-white/50 hover:bg-white/90 hover:text-black text-white"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeDayDialogOpen} onOpenChange={setRemoveDayDialogOpen}>
        <DialogContent className="bg-black/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Remove Workout Day
              </div>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Are you sure you want to remove {dayToRemove} from your workout schedule?
              This will also remove all exercises for this day.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setRemoveDayDialogOpen(false)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveDay}
              disabled={isLoading}
              className="bg-black border border-white/50 hover:bg-white/90 hover:text-black text-white"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDayDialogOpen} onOpenChange={setAddDayDialogOpen}>
        <DialogContent className="bg-black/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Add Workout Days</DialogTitle>
            <DialogDescription className="text-white/70">
              Select one or more days to add to your workout schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-3 text-white/80 text-sm flex items-center">
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5">
                <path d="M7.49991 0.877045C3.84222 0.877045 0.877075 3.84219 0.877075 7.49988C0.877075 11.1575 3.84222 14.1227 7.49991 14.1227C11.1576 14.1227 14.1227 11.1575 14.1227 7.49988C14.1227 3.84219 11.1576 0.877045 7.49991 0.877045ZM1.82708 7.49988C1.82708 4.36686 4.36689 1.82704 7.49991 1.82704C10.6329 1.82704 13.1727 4.36686 13.1727 7.49988C13.1727 10.6329 10.6329 13.1727 7.49991 13.1727C4.36689 13.1727 1.82708 10.6329 1.82708 7.49988ZM7.49991 4.56249C7.77005 4.56249 7.99991 4.79235 7.99991 5.06249V7.49988L9.93741 8.9374C10.1596 9.10068 10.2127 9.41574 10.0495 9.63788C9.8862 9.86002 9.57114 9.91312 9.34901 9.74985L6.99991 8.06235C6.84534 7.95023 6.74991 7.77572 6.74991 7.59988V5.06249C6.74991 4.79235 6.97977 4.56249 7.49991 4.56249Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
              </svg>
              Click on multiple days to select them
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                .filter(day => !availableDays.includes(day as Day))
                .sort((a, b) => getDayOrder(a as Day) - getDayOrder(b as Day))
                .map(day => (
                  <div 
                    key={day}
                    onClick={() => toggleDaySelection(day as Day)}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                      selectedDays.includes(day as Day) 
                        ? "bg-white/20 hover:bg-white/30"
                        : "bg-black/50 border border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 mr-2 rounded flex items-center justify-center border ${
                      selectedDays.includes(day as Day) 
                        ? "bg-white border-white" 
                        : "border-white/50"
                    }`}>
                      {selectedDays.includes(day as Day) && (
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="black" fillRule="evenodd" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span>{day}</span>
                  </div>
                ))}
            </div>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
              .filter(day => !availableDays.includes(day as Day)).length === 0 && (
              <div className="text-white/70 text-center py-2">
                All days are already added to your schedule
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setAddDayDialogOpen(false)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={handleAddDay}
              disabled={isLoading || selectedDays.length === 0}
              className="bg-white hover:bg-white/90 text-black"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${selectedDays.length > 0 ? selectedDays.length : ''} Day${selectedDays.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Please sign in to manage exercises"
      />
    </>
  );
} 