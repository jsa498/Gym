'use client';

import { useState, useEffect } from 'react';
import { useWorkout } from '@/lib/workout-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Plus, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

export function UserManagement() {
  const { currentUser, setCurrentUser } = useWorkout();
  const [users, setUsers] = useState<string[]>(['Mottu', 'Babli']);
  const [newUser, setNewUser] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users and sort them consistently
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('username');

      if (!error && data) {
        // Sort with Mottu first, then Babli, then any other users alphabetically
        const sortedUsers = data.map(user => user.username).sort((a, b) => {
          if (a === 'Mottu') return -1;
          if (b === 'Mottu') return 1;
          if (a === 'Babli') return -1;
          if (b === 'Babli') return 1;
          return a.localeCompare(b);
        });
        setUsers(sortedUsers);
      }
    };

    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.trim()) return;
    
    setIsLoading(true);
    try {
      // Add user to Supabase
      const { error } = await supabase
        .from('users')
        .insert([{ username: newUser.trim() }]);
        
      if (error) throw error;
      
      // Update local state with proper sorting
      const updatedUsers = [...users, newUser.trim()].sort((a, b) => {
        if (a === 'Mottu') return -1;
        if (b === 'Mottu') return 1;
        if (a === 'Babli') return -1;
        if (b === 'Babli') return 1;
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

  const handleDeleteUser = async (index: number) => {
    const userToDelete = users[index];
    
    // Don't allow deleting the current user
    if (userToDelete === currentUser) {
      alert("You can't delete the currently selected user. Please switch users first.");
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${userToDelete}?`)) return;
    
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
      newUsers.splice(index, 1);
      setUsers(newUsers);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (index: number) => {
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
        if (a === 'Mottu') return -1;
        if (b === 'Mottu') return 1;
        if (a === 'Babli') return -1;
        if (b === 'Babli') return 1;
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
                  onClick={handleUpdateUser}
                  className="h-8 w-8 border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
                >
                  <Save className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={isLoading}
                  onClick={() => startEditing(index)}
                  className="h-8 w-8 border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              
              <Button 
                variant="outline"
                size="icon"
                disabled={isLoading || user === currentUser}
                onClick={() => handleDeleteUser(index)}
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
            onClick={handleAddUser}
            className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
} 