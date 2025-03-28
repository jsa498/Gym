'use client';

import { useWorkout } from '@/lib/workout-context';
import { Button } from './ui/button';

export function UserSelector() {
  const { currentUser, setCurrentUser, users } = useWorkout();

  return (
    <div className="flex justify-center gap-4 flex-wrap">
      {users.map((user) => (
        <Button
          key={user}
          variant="outline"
          size="lg"
          className={`w-32 h-14 text-lg font-medium transition-all border-2 ${
            currentUser === user
              ? 'bg-white text-black border-white hover:bg-white/90 hover:text-black'
              : 'bg-transparent text-white border-white/20 hover:border-white hover:bg-white hover:text-black'
          }`}
          onClick={() => setCurrentUser(user)}
        >
          {user}
        </Button>
      ))}
    </div>
  );
} 