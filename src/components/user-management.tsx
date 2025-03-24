'use client';

import { useState, useEffect } from 'react';
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
  const { currentUser, setCurrentUser } = useWorkout();
  const [users, setUsers] = useState<string[]>(['Name 1', 'Name 2']);
  const [newUser, setNewUser] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDeleteIndex, setUserToDeleteIndex] = useState<number | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginAction, setLoginAction] = useState<'add' | 'edit' | 'delete'>('add');
  const { user: authUser } = useAuth();

  // Fetch users and sort them consistently
  useEffect(() => {
    const fetchUsers = async () => {
      // If not authenticated, use default users
      if (!authUser) {
        setUsers(['Name 1', 'Name 2']);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('auth_id', authUser.id);

      if (!error && data) {
        const usernames = data.map(user => user.username);
        
        // Also get buddy name if exists
        const { data: profileData } = await supabase
          .from('profiles')
          .select('buddy_name, has_buddy')
          .eq('id', authUser.id)
          .single();
          
        if (profileData && profileData.has_buddy && profileData.buddy_name) {
          if (!usernames.includes(profileData.buddy_name)) {
            usernames.push(profileData.buddy_name);
          }
        }
        
        // Sort alphabetically
        setUsers(usernames.sort((a, b) => a.localeCompare(b)));
      }
    };

    fetchUsers();
  }, [authUser]);

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
      // Add user to Supabase
      const { error } = await supabase
        .from('users')
        .insert([{ 
          username: newUser.trim(),
          auth_id: authUser.id
        }]);
        
      if (error) throw error;
      
      // Update local state with proper sorting
      const updatedUsers = [...users, newUser.trim()].sort((a, b) => {
        if (a === 'Name 1') return -1;
        if (b === 'Name 1') return 1;
        if (a === 'Name 2') return -1;
        if (b === 'Name 2') return 1;
        return a.localeCompare(b);
      });
      setUsers(updatedUsers);
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
    
    const userToDelete = users[userToDeleteIndex];
    
    setIsLoading(true);
    try {
      // Delete user from Supabase
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', userToDelete);
        
      if (error) throw error;
      
      // Update local state
      const newUsers = [...users];
      newUsers.splice(userToDeleteIndex, 1);
      setUsers(newUsers);
      
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
      
      // Update local state with proper sorting
      const updatedUsers = [...users];
      updatedUsers[editingIndex] = newUsername;
      
      // Apply consistent sorting
      const sortedUsers = updatedUsers.sort((a, b) => {
        if (a === 'Name 1') return -1;
        if (b === 'Name 1') return 1;
        if (a === 'Name 2') return -1;
        if (b === 'Name 2') return 1;
        return a.localeCompare(b);
      });
      
      setUsers(sortedUsers);
      
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