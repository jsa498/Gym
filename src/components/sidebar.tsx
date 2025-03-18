'use client';

import { useState } from 'react';
import { Menu, Users, Dumbbell, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useWorkout } from '@/lib/workout-context';
import { UserManagement } from './user-management';
import { WorkoutManagement } from './workout-management';
import { Settings } from './settings';

type SettingsView = 'users' | 'workouts' | 'settings' | null;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { currentUser } = useWorkout();
  const [activeView, setActiveView] = useState<SettingsView>(null);
  
  const menuItems = [
    {
      id: 'users' as const,
      title: 'Manage Users',
      icon: <Users className="h-5 w-5" />,
      description: 'Add, remove, or edit users',
    },
    {
      id: 'workouts' as const,
      title: 'Manage Workouts',
      icon: <Dumbbell className="h-5 w-5" />,
      description: 'Customize workout days and exercises',
    },
    {
      id: 'settings' as const,
      title: 'Settings',
      icon: <SettingsIcon className="h-5 w-5" />,
      description: 'Application preferences',
    }
  ];

  // Function to render the active view component
  const renderActiveView = () => {
    switch (activeView) {
      case 'users':
        return <UserManagement />;
      case 'workouts':
        return <WorkoutManagement />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <>
      <Button 
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-40 text-white hover:bg-white/10 rounded-full"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Open menu</span>
      </Button>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-black/95 text-white border-r border-white/10 p-0">
          {!activeView ? (
            // Menu list view
            <>
              <SheetHeader className="p-6 pb-2">
                <SheetTitle className="text-xl font-bold">Workout Tracker</SheetTitle>
                <SheetDescription className="text-white/70">
                  Logged in as {currentUser}
                </SheetDescription>
              </SheetHeader>
              
              <div className="p-6 space-y-6 flex-1">
                {menuItems.map((item, index) => (
                  <div key={index} className="group">
                    <button 
                      className="flex items-center space-x-3 w-full p-2 rounded-md hover:bg-white/10 transition-colors"
                      onClick={() => setActiveView(item.id)}
                    >
                      <div className="flex-shrink-0 text-white/70 group-hover:text-white">
                        {item.icon}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-white/50">{item.description}</span>
                      </div>
                    </button>
                    {index < menuItems.length - 1 && (
                      <Separator className="my-4 bg-white/10" />
                    )}
                  </div>
                ))}
              </div>
              
              <SheetFooter className="p-6 pt-0">
                <div className="text-xs text-white/50 text-center">
                  Version 1.0.0
                </div>
              </SheetFooter>
            </>
          ) : (
            // Setting-specific view
            <>
              <div className="p-6 space-y-4">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setActiveView(null)}
                    className="mr-2 h-8 px-2 text-white hover:bg-white/10"
                  >
                    ← Back
                  </Button>
                </div>
                
                <div className="pt-2">
                  {renderActiveView()}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
} 