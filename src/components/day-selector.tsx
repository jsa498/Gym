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
import React from 'react';

export function DaySelector() {
  const { selectedDay, setSelectedDay, currentUser } = useWorkout();
  
  // Get available days based on user
  const getAvailableDays = (): Day[] => {
    const commonDays: Day[] = ['Monday', 'Wednesday', 'Thursday'];
    
    // Saturday is only available for Babli
    if (currentUser === 'Babli') {
      return [...commonDays, 'Saturday'];
    }
    
    return commonDays;
  };
  
  const days = getAvailableDays();
  
  // If Mottu has Saturday selected but switches from Babli, we need to reset the day
  // This ensures Mottu never has Saturday selected since he doesn't workout that day
  React.useEffect(() => {
    if (currentUser === 'Mottu' && selectedDay === 'Saturday') {
      setSelectedDay('Monday');
    }
  }, [currentUser, selectedDay, setSelectedDay]);

  return (
    <div className="flex items-center justify-center gap-4">
      <span className="text-lg font-medium text-white/80">Select a day:</span>
      <Select
        value={selectedDay}
        onValueChange={(value) => setSelectedDay(value as Day)}
      >
        <SelectTrigger className="w-48 h-14 text-lg bg-transparent border-2 border-white/20 hover:border-white focus:border-white focus:ring-0 transition-colors">
          <SelectValue placeholder="Select a day" />
        </SelectTrigger>
        <SelectContent className="bg-black/90 backdrop-blur-sm border-2 border-white/20">
          {days.map((day) => (
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