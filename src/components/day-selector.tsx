'use client';

import { useWorkout } from '@/lib/workout-context';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Day } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function DaySelector() {
  const { selectedDay, setSelectedDay, currentUser } = useWorkout();
  const [availableDays, setAvailableDays] = useState<Day[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle day selection with memoization to prevent unnecessary re-renders
  const handleDayChange = React.useCallback((value: string) => {
    setSelectedDay(value as Day);
  }, [setSelectedDay]);
  
  // Fetch available days for the current user from the database
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserDays = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_days')
          .select('day, day_order')
          .eq('username', currentUser)
          .order('day_order');
        
        if (error) throw error;
        
        if (!isMounted) return;
        
        if (data && data.length > 0) {
          // Extract the days and convert to Day type
          const days = data.map(item => item.day) as Day[];
          setAvailableDays(days);
          
          // If the selected day isn't in the available days, set to the first day
          // Only do this once on initial load
          if (days.length > 0 && !days.includes(selectedDay)) {
            // Use a setTimeout to break potential update cycles
            setTimeout(() => {
              if (isMounted) {
                setSelectedDay(days[0]);
              }
            }, 0);
          }
        } else {
          // Fallback to default days as a last resort
          const defaultDays: Day[] = currentUser === 'Babli' 
            ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
            : ['Monday', 'Wednesday', 'Thursday'];
          setAvailableDays(defaultDays);
        }
      } catch (error) {
        console.error('Error fetching user days:', error);
        if (!isMounted) return;
        
        // Fallback to default days in case of error
        const defaultDays: Day[] = currentUser === 'Babli' 
          ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
          : ['Monday', 'Wednesday', 'Thursday'];
        setAvailableDays(defaultDays);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserDays();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Only depend on currentUser to prevent infinite loops

  // Create a stable value object to prevent unnecessary re-renders
  const selectValue = React.useMemo(() => {
    // Only return a valid Day from availableDays, otherwise undefined to prevent bad renders
    return availableDays.includes(selectedDay as Day) ? selectedDay : undefined;
  }, [selectedDay, availableDays]);
  
  return (
    <div className="flex items-center justify-center gap-4">
      <span className="text-lg font-medium text-white/80">Select a day:</span>
      {availableDays.length > 0 && (
        <Select
          value={selectValue}
          onValueChange={handleDayChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-48 h-14 text-lg bg-transparent border-2 border-white/20 hover:border-white focus:border-white focus:ring-0 transition-colors">
            <SelectValue placeholder={isLoading ? "Loading..." : "Select a day"} />
          </SelectTrigger>
          <SelectContent className="bg-black/90 backdrop-blur-sm border-2 border-white/20">
            {availableDays.map((day) => (
              <SelectItem 
                key={day} 
                value={day}
                className="text-lg text-white focus:bg-white focus:text-black cursor-pointer hover:bg-white/20"
              >
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
} 