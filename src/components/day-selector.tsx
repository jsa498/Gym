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
  
  // Fetch available days for the current user from the database
  useEffect(() => {
    const fetchUserDays = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_days')
          .select('day, day_order')
          .eq('username', currentUser)
          .order('day_order');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Extract the days and convert to Day type
          const days = data.map(item => item.day) as Day[];
          setAvailableDays(days);
          
          // If the selected day isn't in the available days, set to the first day
          if (days.length > 0 && !days.includes(selectedDay)) {
            setSelectedDay(days[0]);
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
        // Fallback to default days in case of error
        const defaultDays: Day[] = currentUser === 'Babli' 
          ? ['Monday', 'Wednesday', 'Thursday', 'Saturday'] 
          : ['Monday', 'Wednesday', 'Thursday'];
        setAvailableDays(defaultDays);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDays();
  }, [currentUser, selectedDay, setSelectedDay]);

  return (
    <div className="flex items-center justify-center gap-4">
      <span className="text-lg font-medium text-white/80">Select a day:</span>
      <Select
        value={selectedDay}
        onValueChange={(value) => setSelectedDay(value as Day)}
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
    </div>
  );
} 