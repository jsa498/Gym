'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, Dumbbell, Settings as SettingsIcon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useWorkout } from '@/lib/workout-context';
import { UserManagement } from './user-management';
import { WorkoutManagement } from './workout-management';
import { Settings } from './settings';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

type SettingsView = 'users' | 'workouts' | 'settings' | null;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { currentUser } = useWorkout();
  const [activeView, setActiveView] = useState<SettingsView>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ignoreNextCloseRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();
  
  // Check if device is mobile based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/auth');
    router.refresh();
  };
  
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

  // Handle hover state - only for desktop
  const handleMouseEnter = () => {
    if (!isMobile) {
      setOpen(true);
      
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile && !activeView) {
      // Only close if there's no active view (meaning we're just in the menu)
      hoverTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, 300);
    }
  };

  // Update to prevent view from closing on interaction
  const handleViewInteraction = (e: React.MouseEvent) => {
    // Stop propagation for all interactions within the sheet content
    e.stopPropagation();
  };

  // Close on click outside when in an active view
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if clicking on the close button or elements within the sheet content
      if ((event.target as HTMLElement).closest('[data-radix-collection-item]') || 
          (event.target as HTMLElement).closest('[role="dialog"]')) {
        return;
      }
      
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        if (ignoreNextCloseRef.current) {
          ignoreNextCloseRef.current = false;
          return;
        }

        // Close sidebar when clicking outside
        setOpen(false);
        setActiveView(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle menu for mobile
  const toggleMenu = () => {
    setOpen(!open);
  };

  // Handle explicit close
  const handleClose = () => {
    setOpen(false);
    if (activeView) {
      setActiveView(null);
    }
  };

  return (
    <>
      {/* Mobile hamburger menu - fixed positioning to overlay on content */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50">
          <button 
            onClick={toggleMenu}
            className="p-3 rounded-full bg-black/90 text-white shadow-lg shadow-black/20 hover:bg-black transition-colors animate-pulse-once flex items-center"
            aria-label="Menu"
            title="Open Menu"
          >
            <Menu className="h-6 w-6" />
            <span className="ml-2 text-sm font-medium sr-only">Menu</span>
          </button>
        </div>
      )}

      <div ref={navRef}>
        {/* Desktop sidebar with hover functionality */}
        {!isMobile && (
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
          </div>
        )}
          
        {/* Expanded sidebar content - for both mobile and desktop */}
        <Sheet 
          open={open} 
          onOpenChange={(state) => {
            // Only allow explicit close via the X button, not by clicking inside content
            if (!state && !ignoreNextCloseRef.current) {
              setOpen(state);
              // Reset active view when closing
              setActiveView(null);
            }
          }}
        >
          <SheetContent 
            side="left" 
            className={`bg-black/95 text-white border-r border-white/10 p-0 ${isMobile ? 'ml-0' : 'left-0 w-[400px]'} w-full max-w-full sm:w-[350px] sm:max-w-[80vw] lg:w-[400px] transition-transform duration-300 ease-in-out z-50 h-full overflow-y-auto`}
            onClick={(e) => {
              // Prevent ALL clicks inside SheetContent from closing the sidebar
              e.stopPropagation();
              handleViewInteraction(e);
            }}
            onMouseEnter={() => {
              if (!isMobile) {
                // Clear any pending close timer when mouse enters SheetContent
                if (hoverTimerRef.current) {
                  clearTimeout(hoverTimerRef.current);
                  hoverTimerRef.current = null;
                }
              }
            }}
            onMouseLeave={() => {
              if (!isMobile && !activeView) {
                // Only close if there's no active view
                hoverTimerRef.current = setTimeout(() => {
                  setOpen(false);
                }, 300);
              }
            }}
            hideCloseButton
          >
            <div className="absolute top-4 right-4 z-50">
              <SheetClose 
                className="rounded-full h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
              >
                <span className="sr-only">Close</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" />
                </svg>
              </SheetClose>
            </div>
            {!activeView ? (
              // Menu list view
              <>
                <SheetHeader className="p-6 pb-2">
                  <SheetTitle className="text-xl font-bold text-white">Workout Tracker</SheetTitle>
                  <SheetDescription className="text-white/70">
                    {authUser ? `Logged in as ${authUser.email}` : `Workout for ${currentUser}`}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="p-6 space-y-6 flex-1">
                  {menuItems.map((item, index) => (
                    <div key={index} className="group">
                      <button 
                        className="flex items-center space-x-4 w-full p-3 rounded-md hover:bg-white/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Just set the active view without closing
                          setActiveView(item.id);
                        }}
                      >
                        <div className="flex-shrink-0 text-white/70 group-hover:text-white">
                          {item.icon}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-base">{item.title}</span>
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
                  <div className="flex flex-col items-center space-y-4 w-full">
                    {authUser && (
                      <button 
                        className="w-full p-3 rounded-md bg-primary/80 hover:bg-primary transition-colors text-white font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false); // Close sidebar before navigating 
                          router.push('/settings/subscription');
                        }}
                      >
                        Manage Subscription
                      </button>
                    )}
                    
                    {authUser ? (
                      <button 
                        className="w-full p-3 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSignOut();
                          setOpen(false); // Close sidebar after sign out
                        }}
                      >
                        Sign Out
                      </button>
                    ) : (
                      <button 
                        className="w-full p-3 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false); // Close sidebar before navigating
                          router.push('/auth');
                        }}
                      >
                        Sign In
                      </button>
                    )}
                    <div className="text-xs text-white/50">
                      Version 1.0.0
                    </div>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveView(null);
                      }}
                      className="mr-2 h-8 px-3 text-white/90 hover:bg-white/5 hover:text-white rounded-md transition-colors"
                    >
                      ← Back
                    </Button>
                  </div>
                  
                  <div className="pt-2 overflow-y-auto h-[calc(100vh-100px)]">
                    {renderActiveView()}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
} 