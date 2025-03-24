'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase } from '@/lib/supabase';
import { useWorkout } from '@/lib/workout-context';
import { X, Edit, Trash, Plus, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { useAuth } from '@/lib/auth-context';

export function ManageUsers() {
  const { users, currentUser, setCurrentUser } = useWorkout();
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [editingUser, setEditingUser] = useState<{ id: number; username: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isSystemUser, setIsSystemUser] = useState(false);
  const { user: authUser } = useAuth();
  const [displayUsers, setDisplayUsers] = useState<string[]>([]);

  // Use users from context that are already filtered
  useEffect(() => {
    setDisplayUsers(users);
  }, [users]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
    setNewUsername('');
    setEditingUser(null);
    setIsSystemUser(false);
  };

  const addUser = async () => {
    if (!newUsername.trim()) return;
    
    try {
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', newUsername.trim())
        .single();
        
      if (existingUser) {
        alert(`User "${newUsername.trim()}" already exists!`);
        return;
      }
      
      const { error } = await supabase
        .from('users')
        .insert([{ 
          username: newUsername.trim(),
          auth_id: authUser?.id || null  // Associate with current auth user if logged in
        }])
        .select('id, username');
        
      if (error) throw error;
      
      setNewUsername('');
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const startEditing = async (username: string) => {
    try {
      // Check if this is one of the system users (Name 1 or Name 2)
      const isSystemUser = username === 'Name 1' || username === 'Name 2';
      setIsSystemUser(isSystemUser);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setEditingUser(data);
        setNewUsername(data.username);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const updateUser = async () => {
    if (!editingUser || !newUsername.trim()) return;
    
    try {
      const oldUsername = editingUser.username;
      
      // If updating a system user, show a warning message
      if (isSystemUser) {
        if (!confirm(`Warning: "${oldUsername}" is a template user. Changing this name will affect the default view for non-logged in users. Proceed?`)) {
          return;
        }
      }
      
      // Update username using the function we created in the database
      const { error } = await supabase.rpc('update_username', {
        old_username: oldUsername,
        new_username: newUsername.trim()
      });
      
      if (error) throw error;
      
      // If we're updating the current user, update that too
      if (currentUser === oldUsername) {
        setCurrentUser(newUsername.trim());
      }
      
      setEditingUser(null);
      setNewUsername('');
      setIsSystemUser(false);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const openDeleteConfirmation = (username: string) => {
    // Check if this is one of the system users (Name 1 or Name 2)
    if (username === 'Name 1' || username === 'Name 2') {
      alert('Cannot delete template users. You can rename them instead.');
      return;
    }
    
    setUserToDelete(username);
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', userToDelete);
        
      if (error) throw error;
      
      // If we deleted the current user, switch to another user if available
      if (currentUser === userToDelete && users.length > 1) {
        const otherUser = users.find(u => u !== userToDelete);
        if (otherUser) setCurrentUser(otherUser);
      }
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={togglePanel}
        className="fixed bottom-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-white"
      >
        Manage Users
      </Button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-16">
        <div className="bg-zinc-900 text-white p-6 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Manage Users</h2>
            <Button variant="ghost" size="sm" onClick={togglePanel}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* List of existing users */}
            <div className="space-y-2">
              {displayUsers.map((user) => (
                <div key={user} className="flex items-center justify-between p-2 rounded hover:bg-zinc-800">
                  <span>{user}</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => startEditing(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openDeleteConfirmation(user)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add/Edit user form */}
            <div className="flex gap-2">
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={editingUser ? "Edit username" : "Enter new username"}
                className="bg-zinc-800 border-zinc-700"
              />
              {editingUser ? (
                <Button onClick={updateUser}>
                  Update
                </Button>
              ) : (
                <Button onClick={addUser}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete}?
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
              onClick={deleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 