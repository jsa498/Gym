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
  Loader2
} from 'lucide-react';
import { exercises as defaultExercises, Day, ExercisesByDay, User as UserType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Type for exercise insert
interface ExerciseInsert {
  username: string;
  day: string;
  name: string;
  position: number;
}

export function WorkoutManagement() {
  const { selectedDay, currentUser, setCurrentUser } = useWorkout();
  // Initialize with default data immediately to prevent UI thrashing
  const [workoutDays, setWorkoutDays] = useState<Day[]>(
    currentUser === 'Babli' 
      ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
      : ['Monday', 'Wednesday', 'Thursday']
  );
  const [selectedDayForEdit, setSelectedDayForEdit] = useState<Day>(selectedDay);
  const [workoutExercises, setWorkoutExercises] = useState<ExercisesByDay>(defaultExercises);
  const [newExercise, setNewExercise] = useState('');
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
  const [newDay, setNewDay] = useState<Day>('Monday');
  const [dayManagementOpen, setDayManagementOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .order('username');

      if (!error && data) {
        // Sort with Mottu first, then Babli, then any other users alphabetically
        const sortedUsers = data.map(user => user.username).sort((a, b) => {
          if (a === 'Mottu') return -1;
          if (b === 'Mottu') return 1;
          if (a === 'Babli') return -1;
          if (b === 'Babli') return 1;
          return a.localeCompare(b);
        });
        setAvailableUsers(sortedUsers);
      }
    };

    fetchUsers();
  }, []);

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

  const handleAddExercise = async () => {
    if (!newExercise.trim()) return;
    
    setIsLoading(true);
    try {
      // Create a new array with the added exercise
      const updatedExercises = {
        ...workoutExercises,
        [selectedDayForEdit]: [...workoutExercises[selectedDayForEdit], newExercise.trim()]
      };
      
      // Update in database
      const { error } = await supabase
        .from('exercises')
        .insert([{
          username: selectedUser,
          day: selectedDayForEdit,
          name: newExercise.trim(),
          position: workoutExercises[selectedDayForEdit].length
        }]);
      
      if (error) throw error;
      
      // Update local state
      setWorkoutExercises(updatedExercises);
      setNewExercise('');
    } catch (error) {
      console.error('Error adding exercise:', error);
      alert('Failed to add exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveExercise = async (day: Day, index: number) => {
    const exerciseToRemove = workoutExercises[day][index];
    
    if (!confirm(`Are you sure you want to remove "${exerciseToRemove}"?`)) return;
    
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
        .eq('name', exerciseToRemove);
      
      if (error) throw error;
      
      // Update local state
      setWorkoutExercises(updatedExercises);
    } catch (error) {
      console.error('Error removing exercise:', error);
      alert('Failed to remove exercise. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const moveExercise = async (day: Day, fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workoutExercises[day].length) return;
    
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
    
    // Pre-populate with defaults for the selected user immediately
    const defaultDays: Day[] = user === 'Babli' 
      ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
      : ['Monday', 'Wednesday', 'Thursday'];
    setAvailableDays(defaultDays);
    setWorkoutDays(defaultDays);
  };

  // Add a new day
  const handleAddDay = async () => {
    if (!newDay || availableDays.includes(newDay)) return;
    
    setIsLoading(true);
    try {
      const dayOrder = getDayOrder(newDay);
      
      // Insert the new day in the database with order
      const { error } = await supabase
        .from('user_days')
        .insert([{ 
          username: selectedUser, 
          day: newDay,
          day_order: dayOrder
        }]);
      
      if (error) throw error;
      
      // Update local state - add new day and sort by order
      const updatedDays = [...availableDays, newDay].sort((a, b) => getDayOrder(a as Day) - getDayOrder(b as Day));
      setAvailableDays(updatedDays as Day[]);
      setWorkoutDays(updatedDays as Day[]);
      
      // Initialize exercises for the new day if needed
      if (!workoutExercises[newDay] || workoutExercises[newDay].length === 0) {
        const updatedExercises = {
          ...workoutExercises,
          [newDay]: [] 
        };
        setWorkoutExercises(updatedExercises);
      }
      
      // Close the day management panel
      setDayManagementOpen(false);
    } catch (error) {
      console.error('Error adding day:', error);
      alert('Failed to add day. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a day
  const handleRemoveDay = async (day: Day) => {
    if (!confirm(`Are you sure you want to remove "${day}"? This will delete all exercises for this day.`)) return;
    
    setIsLoading(true);
    try {
      // Delete the day from the database
      const { error: dayError } = await supabase
        .from('user_days')
        .delete()
        .eq('username', selectedUser)
        .eq('day', day);
      
      if (dayError) throw dayError;
      
      // Delete any exercises for this day
      const { error: exerciseError } = await supabase
        .from('exercises')
        .delete()
        .eq('username', selectedUser)
        .eq('day', day);
      
      if (exerciseError) throw exerciseError;
      
      // Update local state
      const updatedDays = availableDays.filter(d => d !== day);
      setAvailableDays(updatedDays);
      setWorkoutDays(updatedDays);
      
      // Create a new object without the specified day
      const remainingExercises = Object.fromEntries(
        Object.entries(workoutExercises).filter(([key]) => key !== day)
      ) as ExercisesByDay;
      setWorkoutExercises(remainingExercises);
      
      // If the selected day for edit is removed, change to the first available day
      if (selectedDayForEdit === day && updatedDays.length > 0) {
        setSelectedDayForEdit(updatedDays[0]);
      }
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
                    ? "bg-white text-black" 
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
    <div className="p-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
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
                  ? "bg-white text-black" 
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
                        handleRemoveDay(day);
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
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="newDay" className="text-white">Add New Day</Label>
                <Select 
                  value={newDay} 
                  onValueChange={(value) => {
                    setNewDay(value as Day);
                  }}
                >
                  <SelectTrigger id="newDay" className="bg-black/50 border-white/20 text-white">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/20">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                      .filter(day => !availableDays.includes(day as Day))
                      .sort((a, b) => getDayOrder(a as Day) - getDayOrder(b as Day))
                      .map(day => (
                        <SelectItem 
                          key={day} 
                          value={day}
                          className="text-white hover:bg-white/20"
                        >
                          {day}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="default" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddDay();
                }}
                disabled={availableDays.includes(newDay) || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} 
                Add Day
              </Button>
            </div>
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
                            handleRemoveExercise(day, index);
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
                      value={newExercise}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewExercise(e.target.value);
                      }}
                      placeholder="New exercise name..."
                      className="flex-1 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 text-white placeholder:text-white/50 h-9"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading || !newExercise.trim()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddExercise();
                      }}
                      className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-black h-9"
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
  );
} 