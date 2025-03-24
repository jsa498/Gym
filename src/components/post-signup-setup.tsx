'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase, applyDatabaseFixes, createSupportFunctions } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type SetupStep = 'display_name' | 'buddy' | 'template' | 'days';

type PostSignupSetupProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  forceComplete?: boolean;
};

export function PostSignupSetup({ isOpen, onClose, userId, forceComplete = false }: PostSignupSetupProps) {
  const [step, setStep] = useState<SetupStep>('display_name');
  const [displayName, setDisplayName] = useState('');
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [hasBuddy, setHasBuddy] = useState<boolean>(false); // Set default to false instead of null
  const [buddyName, setBuddyName] = useState('');
  const [templateChoice, setTemplateChoice] = useState<'template' | 'fresh'>('template');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday', 'Thursday']);
  const router = useRouter();

  // Create necessary support functions and fix database structure on mount
  useEffect(() => {
    const setupDatabase = async () => {
      if (userId) {
        try {
          console.log('Setting up database support functions...');
          await createSupportFunctions();
          console.log('Applying database fixes...');
          await applyDatabaseFixes();
        } catch (error) {
          console.error('Error setting up database:', error);
        }
      }
    };
    
    setupDatabase();
  }, [userId]);

  // Fetch current display name if exists
  useEffect(() => {
    const fetchDisplayName = async () => {
      try {
        console.log('PostSignupSetup: Fetching user data for userId:', userId);
        console.log('PostSignupSetup: Force complete mode:', forceComplete);
        
        // Get the display name from profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, template_preference, has_buddy, buddy_name')
          .eq('id', userId)
          .single();
        
        // Get user metadata from the user table
        const { data: userTableData } = await supabase
          .from('users')
          .select('username')
          .eq('auth_id', userId)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        
        // Try to get the best display name from available sources
        let displayNameValue = '';
        
        // If profile already exists, use that value
        if (profileData && profileData.display_name) {
          displayNameValue = profileData.display_name;
          
          // If we're not forcing complete setup and they have buddy info,
          // prepopulate those fields too
          if (!forceComplete && profileData.has_buddy !== null) {
            setHasBuddy(profileData.has_buddy);
            if (profileData.has_buddy && profileData.buddy_name) {
              setBuddyName(profileData.buddy_name);
            }
          } else {
            // Ensure hasBuddy is set to false as default
            setHasBuddy(false);
          }
        }
        // If we have a username in the users table
        else if (userTableData && userTableData.username) {
          displayNameValue = userTableData.username;
        }
        
        if (displayNameValue) {
          setCurrentDisplayName(displayNameValue);
          setDisplayName(displayNameValue); // Pre-fill the input
        }

        // If template preference already exists but the component is still open,
        // we'll still let the user go through the setup process
        if (profileData && profileData.template_preference) {
          setTemplateChoice(profileData.template_preference as 'template' | 'fresh');
        }
      } catch (error) {
        console.error('Error fetching display name:', error);
      }
    };
    
    if (userId) {
      fetchDisplayName();
    }
  }, [userId, forceComplete]);

  const handleDisplayNameSubmit = async () => {
    if (!displayName.trim()) return;
    
    try {
      // Update profile with display name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName.trim()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update username in users table
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          username: displayName.trim()
        })
        .eq('auth_id', userId);

      if (userError) throw userError;

      setStep('buddy');
    } catch (error) {
      console.error('Error saving display name:', error);
    }
  };

  const handleBuddyChoice = async () => {
    try {
      if (!hasBuddy) {
        // Update profile to indicate no buddy
        await supabase
          .from('profiles')
          .update({ 
            has_buddy: false,
            buddy_name: null
          })
          .eq('id', userId);

        setStep('template');
        return;
      }

      if (!buddyName.trim()) return;
      
      // Update profile with buddy info
      const { error } = await supabase
        .from('profiles')
        .update({ 
          has_buddy: true,
          buddy_name: buddyName.trim()
        })
        .eq('id', userId);

      if (error) throw error;

      setStep('template');
    } catch (error) {
      console.error('Error saving buddy info:', error);
    }
  };

  const handleTemplateChoice = async () => {
    try {
      console.log('PostSignupSetup: Saving template choice:', templateChoice);
      
      // Update user's template preference
      const { error } = await supabase
        .from('profiles')
        .update({ template_preference: templateChoice })
        .eq('id', userId);

      if (error) throw error;

      // Always move to the days step in the flow to ensure complete setup
      console.log('PostSignupSetup: Moving to days step');
      setStep('days');
    } catch (error) {
      console.error('Error saving template preference:', error);
    }
  };

  const handleDaySelection = async () => {
    try {
      console.log('Setting up workout days for user:', userId);
      
      // Get the current user information - with better error handling
      let userData;
      const { data: fetchedUserData, error: userError } = await supabase
        .from('users')
        .select('username, id')
        .eq('auth_id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        
        // If user doesn't exist yet, try to create it using profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile data:', profileError);
        }  
          
        if (profileData?.display_name) {
          // Create user record if it doesn't exist
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .upsert({ 
              username: profileData.display_name, 
              auth_id: userId 
            })
            .select('username, id');
            
          if (createError) {
            console.error('Failed to create user record:', createError);
            throw new Error('Could not create user record');
          }
          
          if (newUser && newUser.length > 0) {
            console.log('Created missing user record:', newUser[0]);
            userData = newUser[0];
          } else {
            throw new Error('User record created but no data returned');
          }
        } else {
          // If no profile data, create a generic username
          const username = `user_${Date.now().toString().substring(6)}`;
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .upsert({ 
              username: username, 
              auth_id: userId 
            })
            .select('username, id');
            
          if (createError) {
            console.error('Failed to create generic user record:', createError);
            throw new Error('Could not create user record');
          }
          
          if (newUser && newUser.length > 0) {
            console.log('Created generic user record:', newUser[0]);
            userData = newUser[0];
          } else {
            throw new Error('User record created but no data returned');
          }
        }
      } else {
        userData = fetchedUserData;
      }
      
      if (!userData) throw new Error('User record not found');
      
      console.log('Found user:', userData.username);
      
      // Delete existing days for this user's username
      const { error: deleteError } = await supabase
        .from('user_days')
        .delete()
        .eq('username', userData.username);
        
      if (deleteError) {
        console.error('Error deleting existing user days:', deleteError);
      }
      
      // Define type for day entries
      type DayEntry = {
        username: string;
        day: string;
        day_order: number;
        auth_id?: string;  // Make auth_id optional
      };
      
      // Create days to insert with proper null/undefined handling
      const daysToInsert: DayEntry[] = selectedDays.map((day, index) => {
        const entry: DayEntry = {
          username: userData.username,
          day,
          day_order: index + 1
        };
        
        // Only add auth_id if it's a valid UUID
        if (userId && userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          entry.auth_id = userId;
        }
        
        return entry;
      });

      console.log('Created day entries for user:', daysToInsert);

      if (hasBuddy && buddyName) {
        console.log('Setting up buddy days for:', buddyName);
        
        try {
          // Make sure the buddy exists in the users table
          const { data: existingBuddy, error: buddyError } = await supabase
            .from('users')
            .select('username')
            .eq('username', buddyName)
            .single();
            
          if (buddyError && buddyError.code !== 'PGRST116') {
            console.error('Error checking for buddy:', buddyError);
          }
          
          // If buddy doesn't exist, create the user record
          if (!existingBuddy) {
            console.log('Creating new buddy user record');
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                username: buddyName
                // No auth_id for buddy users
              });
              
            if (insertError) {
              console.error('Error creating buddy user:', insertError);
            }
          }
          
          // For buddy user, we don't assign an auth_id because they don't have their own authentication
          const buddyDays = selectedDays.map((day, index) => ({
            username: buddyName,
            day,
            day_order: index + 1
            // No auth_id for buddy
          }));
          
          console.log('Created buddy day entries:', buddyDays);
          daysToInsert.push(...buddyDays);
        } catch (buddyErr) {
          console.error('Error setting up buddy:', buddyErr);
          // Continue with main user setup even if buddy setup fails
        }
      }

      // Insert all the days with error handling
      console.log('Inserting day entries:', daysToInsert);
      const { error: insertError } = await supabase
        .from('user_days')
        .insert(daysToInsert);
        
      if (insertError) {
        console.error('Error inserting user days:', insertError);
        throw insertError;
      }

      // Update template preference to mark setup as complete
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          template_preference: templateChoice,
          has_buddy: hasBuddy,
          buddy_name: hasBuddy ? buddyName : null
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('Error updating profile preferences:', updateError);
        throw updateError;
      }
      
      console.log('Setup completed successfully for user:', userId);

      // Successfully set up - continue to main app
      onClose();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error saving workout days:', error);
      alert('There was an error setting up your workout days. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      // Only allow closing the dialog if we're not forcing completion
      if (!forceComplete) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px] bg-black text-white border-white/20">
        {step === 'display_name' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Welcome!</DialogTitle>
              <DialogDescription className="text-white/70">
                What would you like to be called? This name will show on your display and workouts.
                {currentDisplayName && (
                  <p className="mt-1">Current name: {currentDisplayName}</p>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 text-white"
              />
              <p className="text-sm text-white/60 mt-2">
                You can change this later in the Manage Users settings.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleDisplayNameSubmit}
                disabled={!displayName.trim()}
                className="bg-white text-black hover:bg-white/90"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'buddy' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Workout Buddy</DialogTitle>
              <DialogDescription className="text-white/70">
                Would you like to add a workout buddy to track their workouts too?
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">
              <RadioGroup
                value={hasBuddy ? 'yes' : 'no'}
                onValueChange={(value: string) => setHasBuddy(value === 'yes')}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="font-medium">
                    Yes, add a buddy
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="font-medium">
                    No, just me
                  </Label>
                </div>
              </RadioGroup>

              {hasBuddy && (
                <div className="space-y-2">
                  <Label htmlFor="buddy-name">Buddy&apos;s Name</Label>
                  <Input
                    id="buddy-name"
                    value={buddyName}
                    onChange={(e) => setBuddyName(e.target.value)}
                    placeholder="Enter buddy's name"
                    className="bg-transparent border-2 border-white/20 hover:border-white/30 focus:border-white focus:ring-0 text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('display_name')}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Back
              </Button>
              <Button
                onClick={handleBuddyChoice}
                disabled={hasBuddy && !buddyName.trim()} // Only disable if "Yes" selected and no buddy name
                className="bg-white text-black hover:bg-white/90"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'template' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Choose Your Starting Point</DialogTitle>
              <DialogDescription className="text-white/70">
                Would you like to start with our recommended template or start fresh?
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <RadioGroup
                value={templateChoice}
                onValueChange={(value: 'template' | 'fresh') => setTemplateChoice(value)}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="template" id="template" />
                  <Label htmlFor="template">Use Template</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fresh" id="fresh" />
                  <Label htmlFor="fresh">Start Fresh</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('buddy')}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Back
              </Button>
              <Button
                onClick={handleTemplateChoice}
                className="bg-white text-black hover:bg-white/90"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'days' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Select Workout Days</DialogTitle>
              <DialogDescription className="text-white/70">
                Choose which days you plan to work out
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      id={day}
                      checked={selectedDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDays([...selectedDays, day]);
                        } else {
                          setSelectedDays(selectedDays.filter(d => d !== day));
                        }
                      }}
                      className="mr-3 h-4 w-4 rounded border-white/20 bg-white/10"
                    />
                    <Label htmlFor={day}>{day}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('template')}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Back
              </Button>
              <Button
                onClick={handleDaySelection}
                disabled={selectedDays.length === 0}
                className="bg-white text-black hover:bg-white/90"
              >
                Finish Setup
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 