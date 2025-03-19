'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, Dumbbell, Settings as SettingsIcon } from 'lucide-react';
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
  const [isHovering, setIsHovering] = useState(false);
  const { currentUser } = useWorkout();
  const [activeView, setActiveView] = useState<SettingsView>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ignoreNextCloseRef = useRef(false);
  
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

  // Handle hover state
  const handleMouseEnter = () => {
    setIsHovering(true);
    setOpen(true);
    
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    
    // Only close if there is no active view
    if (!activeView) {
      hoverTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, 300);
    }
  };

  // Update to prevent view from closing on interaction
  const handleViewInteraction = (e: React.MouseEvent) => {
    // Prevent the event from bubbling up
    e.stopPropagation();
    // Set flag to ignore next close
    ignoreNextCloseRef.current = true;
  };

  // Close on click outside when in an active view
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        if (ignoreNextCloseRef.current) {
          ignoreNextCloseRef.current = false;
          return;
        }

        if (!isHovering && activeView) {
          // Close sidebar only if we're clicking outside completely
          setOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeView, isHovering]);

  return (
    <div ref={navRef}>
      <div 
        className="fixed left-0 top-0 bottom-0 z-50 flex" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Collapsed sidebar with icons - only show when sidebar is collapsed */}
        {!open && (
          <div className="w-14 bg-black/90 h-full flex flex-col items-center pt-16 space-y-8 border-r border-white/10">
            {menuItems.map((item, index) => (
              <div 
                key={index}
                className="text-white/70 hover:text-white transition-colors cursor-pointer sidebar-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView(item.id);
                  setOpen(true);
                }}
              >
                {item.icon}
              </div>
            ))}
          </div>
        )}
        
        {/* Expanded sidebar content */}
        <Sheet open={open} onOpenChange={(state) => {
          // Only update open state if manually closed and no active view
          if (!state && !activeView) {
            setOpen(false);
          }
        }}>
          <SheetContent 
            side="left" 
            className={`bg-black/95 text-white border-r border-white/10 p-0 ${!open ? 'ml-14' : 'ml-0'} w-full max-w-full sm:w-[350px] sm:max-w-[80vw] md:max-w-[350px] transition-transform duration-300 ease-in-out z-50`}
            onClick={(e) => handleViewInteraction(e)}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            {!activeView ? (
              // Menu list view
              <>
                <SheetHeader className="p-6 pb-2">
                  <SheetTitle className="text-xl font-bold text-white">Workout Tracker</SheetTitle>
                  <SheetDescription className="text-white/70">
                    Logged in as {currentUser}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="p-6 space-y-6 flex-1">
                  {menuItems.map((item, index) => (
                    <div key={index} className="group">
                      <button 
                        className="flex items-center space-x-3 w-full p-2 rounded-md hover:bg-white/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveView(item.id);
                        }}
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
                <div 
                  className="p-6 space-y-4" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveView(null);
                      }}
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
      </div>
    </div>
  );
} 