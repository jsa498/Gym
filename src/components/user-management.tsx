'use client';

import { useState } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Plus, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { LoginPrompt } from './login-prompt';

export function UserManagement() {
  const { currentUser, setCurrentUser, users, removeUserFromState } = useWorkout();
  const [newUser, setNewUser] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDeleteIndex, setUserToDeleteIndex] = useState<number | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginAction, setLoginAction] = useState<'add' | 'edit' | 'delete'>('add');
  const { user: authUser } = useAuth();

  const handleAddUser = async () => {
    if (!newUser.trim()) return;
    
    // Check if user is logged in
    if (!authUser) {
      setLoginAction('add');
      setShowLoginPrompt(true);
      return;
    }
    
    setIsLoading(true);
    try {
      // Get current profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('buddy_name, has_buddy, display_name')
        .eq('id', authUser.id)
        .single();
        
      if (profileError) throw profileError;
      
      const buddyName = newUser.trim();
      
      // If we already have a buddy, add the new user as a regular user
      if (profileData && profileData.has_buddy && profileData.buddy_name) {
        // Add user to Supabase users table
        const { error } = await supabase
          .from('users')
          .insert([{ 
            username: buddyName,
            auth_id: authUser.id  // Associate with the current user
          }]);
          
        if (error) throw error;
      } else {
        // No buddy yet, so add as buddy in the profile
        const { error } = await supabase
          .from('profiles')
          .update({ 
            has_buddy: true,
            buddy_name: buddyName
          })
          .eq('id', authUser.id);
          
        if (error) throw error;
        
        // Also add to users table for consistency
        const { error: userError } = await supabase
          .from('users')
          .insert([{ 
            username: buddyName,
            auth_id: authUser.id  // Associate with the current user
          }]);
          
        if (userError) {
          console.error('Error adding buddy to users table:', userError);
          // Continue anyway, as the profile update succeeded
        }
        
        // Create a workout buddy record for proper tracking
        const { error: buddyError } = await supabase
          .from('workout_buddies')
          .upsert({
            profile_id: authUser.id,
            buddy_name: buddyName
          }, { onConflict: 'profile_id,buddy_name' });
          
        if (buddyError) {
          console.error('Error creating workout buddy link:', buddyError);
          // Continue anyway, as this is a secondary feature
        }
        
        // If there are workout days for the main user, create the same days for the buddy
        const { data: userDays, error: daysError } = await supabase
          .from('user_days')
          .select('day, day_order')
          .eq('auth_id', authUser.id)
          .eq('username', profileData.display_name);
          
        if (!daysError && userDays && userDays.length > 0) {
          // Create days for the buddy
          const buddyDays = userDays.map(dayData => ({
            username: buddyName,
            day: dayData.day,
            day_order: dayData.day_order,
            auth_id: authUser.id
          }));
          
          const { error: insertDaysError } = await supabase
            .from('user_days')
            .insert(buddyDays);
            
          if (insertDaysError) {
            console.error('Error creating workout days for buddy:', insertDaysError);
          }
        }
      }
      
      // The real-time subscription will update the users list
      setNewUser('');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteConfirmation = (index: number) => {
    const userToDelete = users[index];
    
    // Check if user is logged in
    if (!authUser) {
      setLoginAction('delete');
      setShowLoginPrompt(true);
      return;
    }
    
    // Don't allow deleting the current user
    if (userToDelete === currentUser) {
      alert("You can't delete the currently selected user. Please switch users first.");
      return;
    }
    
    setUserToDeleteIndex(index);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (userToDeleteIndex === null) return;
    
    const userToDeleteName = users[userToDeleteIndex];
    
    setIsLoading(true);
    try {
      // First check if this is a buddy user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('buddy_name, has_buddy')
        .eq('id', authUser?.id || '')
        .single();
        
      if (profileError) throw profileError;
      
      if (profileData && profileData.has_buddy && profileData.buddy_name === userToDeleteName) {
        // This is a buddy user, update the profile
        const { error } = await supabase
          .from('profiles')
          .update({ 
            has_buddy: false,
            buddy_name: null
          })
          .eq('id', authUser?.id || '');
          
        if (error) throw error;
        
        // Also delete from workout_buddies table for real-time updates
        if (authUser?.id) {
          await supabase
            .from('workout_buddies')
            .delete()
            .eq('profile_id', authUser.id)
            .eq('buddy_name', userToDeleteName);
        }
        
        // Also delete any workout data for this buddy
        await supabase
          .from('user_days')
          .delete()
          .eq('username', userToDeleteName);
          
        await supabase
          .from('workout_sets')
          .delete()
          .eq('username', userToDeleteName);
      } else {
        // This is a regular user, delete from users table
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('username', userToDeleteName);
          
        if (error) throw error;
      }
      
      // Update local state immediately for responsive UI
      removeUserFromState(userToDeleteName);
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setUserToDeleteIndex(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (index: number) => {
    // Check if user is logged in
    if (!authUser) {
      setLoginAction('edit');
      setShowLoginPrompt(true);
      return;
    }
    
    setEditingIndex(index);
    setEditingName(users[index]);
  };

  const handleUpdateUser = async () => {
    if (editingIndex === null || !editingName.trim()) return;
    
    const oldUsername = users[editingIndex];
    const newUsername = editingName.trim();
    
    if (oldUsername === newUsername) {
      setEditingIndex(null);
      return;
    }
    
    setIsLoading(true);
    try {
      // Update user in Supabase
      const { error } = await supabase.rpc('update_username', {
        old_username: oldUsername,
        new_username: newUsername
      });
      
      if (error) throw error;
      
      // The users list will be updated by the real-time subscription
      
      // If the current user was renamed, update that too
      if (currentUser === oldUsername) {
        setCurrentUser(newUsername as User);
      }
      
      setEditingIndex(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="p-4 overflow-visible" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Manage Users</h3>
          
          <div className="space-y-4">
            {users.map((user, index) => (
              <div key={index} className="flex items-center justify-between">
                {editingIndex === index ? (
                  <div className="flex-1 mr-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 text-white"
                    />
                  </div>
                ) : (
                  <div className="flex-1 font-medium text-white">{user}</div>
                )}
                
                <div className="flex space-x-2">
                  {editingIndex === index ? (
                    <Button 
                      variant="outline" 
                      size="icon"
                      disabled={isLoading}
                      onClick={(e) => { e.stopPropagation(); handleUpdateUser(); }}
                      className="h-8 w-8 border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="icon"
                      disabled={isLoading}
                      onClick={(e) => { e.stopPropagation(); startEditing(index); }}
                      className="h-8 w-8 border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="icon"
                    disabled={isLoading || user === currentUser}
                    onClick={(e) => { e.stopPropagation(); openDeleteConfirmation(index); }}
                    className="h-8 w-8 border-white/20 bg-white/10 text-white hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <Label htmlFor="new-user" className="text-white/80 text-sm font-medium mb-2 block">
              Add New User
            </Label>
            <div className="flex space-x-2">
              <Input
                id="new-user"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                placeholder="Enter name..."
                className="flex-1 bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 text-white placeholder:text-white/50"
              />
              <Button 
                variant="outline"
                disabled={isLoading || !newUser.trim()}
                onClick={(e) => { e.stopPropagation(); handleAddUser(); }}
                className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete {userToDeleteIndex !== null ? users[userToDeleteIndex] : ''}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Prompt */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message={
          loginAction === 'add' 
            ? "Please sign in to add new users to your workout tracker" 
            : loginAction === 'edit'
            ? "Please sign in to edit user information"
            : "Please sign in to delete users from your workout tracker"
        }
      />
    </>
  );
} 