'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Moon, Sun, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [resetAppDialogOpen, setResetAppDialogOpen] = useState(false);
  const [finalResetConfirmDialogOpen, setFinalResetConfirmDialogOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    // In a real app, we'd save this preference to localStorage or a database
  };

  const openClearDataDialog = () => {
    setClearDataDialogOpen(true);
  };

  const clearAllData = async () => {
    setClearDataDialogOpen(false);
    
    setIsLoading(true);
    try {
      // Clear all workout sets from database
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .neq('id', 0); // Delete all records
      
      if (error) throw error;
      
      alert('All workout data has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openResetAppDialog = () => {
    setResetAppDialogOpen(true);
  };

  const proceedToFinalConfirmation = () => {
    setResetAppDialogOpen(false);
    setFinalResetConfirmDialogOpen(true);
  };

  const resetApp = async () => {
    setFinalResetConfirmDialogOpen(false);
    
    setIsLoading(true);
    try {
      // In a production app, we'd have a proper API for this
      // This is a simplified version
      await Promise.all([
        supabase.from('workout_sets').delete().neq('id', 0),
        supabase.from('exercises').delete().neq('id', 0),
        // Keep the default users
      ]);
      
      alert('App has been reset successfully. Please refresh the page.');
    } catch (error) {
      console.error('Error resetting app:', error);
      alert('Failed to reset app. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6 p-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white">Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">Theme</div>
              <div className="text-sm text-white/50">Change the app appearance</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 mr-1" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-1" />
                  Dark
                </>
              )}
            </Button>
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="space-y-4">
            <div className="font-medium text-white">Data Management</div>
            
            <div className="space-y-2">
              <div className="text-sm text-white/70">
                Clear your workout history to start fresh
              </div>
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  openClearDataDialog();
                }}
                className="w-full border-white/20 bg-white/10 text-white hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Workout Data
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-white/70">
                Reset the entire app (removes all data)
              </div>
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  openResetAppDialog();
                }}
                className="w-full border-white/20 bg-white/10 text-white hover:bg-red-900 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Factory Reset
              </Button>
            </div>
          </div>
        </div>
        
        <div className="pt-4 text-center text-xs text-white/40">
          <div>Workout Tracker v1.0.0</div>
          <div className="mt-1">Created with 💪 for fitness</div>
        </div>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Clear Workout Data
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to clear all workout data? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setClearDataDialogOpen(false)}
              className="border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={clearAllData}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset App Confirmation Dialog */}
      <Dialog open={resetAppDialogOpen} onOpenChange={setResetAppDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Factory Reset
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to reset the entire app? This will delete ALL data including users, exercises, and workouts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setResetAppDialogOpen(false)}
              className="border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={proceedToFinalConfirmation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Reset Confirmation Dialog */}
      <Dialog open={finalResetConfirmDialogOpen} onOpenChange={setFinalResetConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              FINAL WARNING
            </DialogTitle>
            <DialogDescription className="text-zinc-400 font-semibold">
              THIS IS PERMANENT AND CANNOT BE UNDONE. Are you absolutely sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setFinalResetConfirmDialogOpen(false)}
              className="border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={resetApp}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 