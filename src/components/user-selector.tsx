'use client';

import { useWorkout } from '@/lib/workout-context';
import { Button } from './ui/button';

export function UserSelector() {
  const { currentUser, setCurrentUser } = useWorkout();

  return (
    <div className="flex justify-center gap-4">
      <Button
        variant="outline"
        size="lg"
        className={`w-32 h-14 text-lg font-medium transition-all border-2 hover:bg-white hover:text-black ${
          currentUser === 'Mottu' 
            ? 'bg-white text-black border-white' 
            : 'bg-transparent text-white border-white/20 hover:border-white'
        }`}
        onClick={() => setCurrentUser('Mottu')}
      >
        Mottu
      </Button>
      <Button
        variant="outline"
        size="lg"
        className={`w-32 h-14 text-lg font-medium transition-all border-2 hover:bg-white hover:text-black ${
          currentUser === 'Babli' 
            ? 'bg-white text-black border-white' 
            : 'bg-transparent text-white border-white/20 hover:border-white'
        }`}
        onClick={() => setCurrentUser('Babli')}
      >
        Babli
      </Button>
    </div>
  );
} 