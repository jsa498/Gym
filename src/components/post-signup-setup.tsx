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
      
      // First, update profile with buddy information
      if (hasBuddy && buddyName) {
        console.log('Setting up buddy for:', buddyName);
        
        try {
          // Update the profile to mark buddy status
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              has_buddy: true,
              buddy_name: buddyName,
              template_preference: templateChoice
            })
            .eq('id', userId);
            
          if (profileError) {
            console.error('Error updating profile with buddy:', profileError);
            throw profileError;
          }
        } catch (buddyErr) {
          console.error('Error setting up buddy:', buddyErr);
          throw buddyErr;
        }
      }

      // Now handle workout days
      console.log('Setting up workout days...');

      // First, delete existing days for the main user
      const { error: deleteError } = await supabase
        .from('user_days')
        .delete()
        .eq('auth_id', userId);
        
      if (deleteError) {
        console.error('Error deleting existing user days:', deleteError);
        throw deleteError;
      }

      // Try to get the current user's username from the profiles table first
      // This is more reliable than depending on the users table which might not have an entry yet
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        throw profileError;
      }
      
      // Use the username from the profile data
      const username = profileData.display_name;
      
      // Now check if we need to create a record in the users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, username')
        .eq('auth_id', userId);
        
      // If no user exists or there's an error, create the user record
      if (userCheckError || !existingUser || existingUser.length === 0) {
        console.log('Creating user record for:', username);
        
        // Insert the user record
        const { error: createUserError } = await supabase
          .from('users')
          .insert([{
            username: username,
            auth_id: userId
          }]);
          
        if (createUserError) {
          console.error('Error creating user record:', createUserError);
          // Continue anyway - the important thing is we have the username
        }
      }
      
      // Create days entries for main user
      const mainUserDays = selectedDays.map((day, index) => ({
        username: username,
        day,
        day_order: index + 1,
        auth_id: userId
      }));

      // Create days entries for buddy if needed
      const buddyDays = hasBuddy && buddyName ? selectedDays.map((day, index) => ({
        username: buddyName,
        day,
        day_order: index + 1,
        auth_id: userId  // Associate buddy days with the main user's auth_id
      })) : [];

      // Insert all days at once
      const allDays = [...mainUserDays, ...buddyDays];
      const { error: insertError } = await supabase
        .from('user_days')
        .insert(allDays);
        
      if (insertError) {
        console.error('Error inserting user days:', insertError);
        throw insertError;
      }

      // Now create the buddy user record if needed
      if (hasBuddy && buddyName) {
        console.log('Creating/updating buddy user record for:', buddyName);
        
        // Check if the buddy already exists as a user
        const { data: existingBuddy } = await supabase
          .from('users')
          .select('id, username')
          .eq('username', buddyName);
          
        // If buddy doesn't exist, create them
        if (!existingBuddy || existingBuddy.length === 0) {
          const { error: createBuddyError } = await supabase
            .from('users')
            .insert([{
              username: buddyName,
              auth_id: userId  // Associate with the current auth user
            }]);
            
          if (createBuddyError) {
            console.error('Error creating buddy user record:', createBuddyError);
            // Continue anyway - the important thing is to have user days created
          }
        }
        
        // Create a workout buddy record in the workout_buddies table
        const { error: buddyLinkError } = await supabase
          .from('workout_buddies')
          .upsert({
            profile_id: userId,
            buddy_name: buddyName
          }, { onConflict: 'profile_id,buddy_name' });
          
        if (buddyLinkError) {
          console.error('Error creating workout buddy link:', buddyLinkError);
          // Continue anyway since this is a secondary feature
        }
      }

      console.log('Workout days setup completed');
      
      // Close the signup modal and redirect
      onClose();
      
      // Redirect to the main page
      if (window.location.pathname !== '/') {
        router.push('/');
      } else {
        // Force a refresh if already on the main page
        router.refresh();
      }
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