'use client';

import { useEffect, useState } from 'react';
import { supabase, applyDatabaseFixes, createSupportFunctions } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PostSignupSetup } from './post-signup-setup';

export function OnboardingCheck() {
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        setUserId(user.id);
        
        // Ensure database is properly set up
        console.log('Setting up database support functions...');
        await createSupportFunctions().catch(err => console.error('Could not create support functions:', err));
        console.log('Applying database fixes...');
        await applyDatabaseFixes().catch(err => console.error('Could not apply database fixes:', err));
        
        // Check if profile has template preference
        const { data: profile } = await supabase
          .from('profiles')
          .select('template_preference')
          .eq('id', user.id)
          .single();
          
        // Check if user has workout days
        const { data: userEntry } = await supabase
          .from('users')
          .select('username')
          .eq('auth_id', user.id)
          .single();
          
        let hasWorkoutDays = false;
        if (userEntry) {
          const { data: userDays } = await supabase
            .from('user_days')
            .select('id')
            .eq('username', userEntry.username)
            .limit(1);
            
          hasWorkoutDays = !!userDays && userDays.length > 0;
        }
        
        // If any setup step is incomplete, show the setup dialog
        const setupIncomplete = !profile || profile.template_preference === null;
        
        console.log('Setup status check:', { 
          hasProfile: !!profile, 
          hasTemplatePreference: profile?.template_preference !== null,
          hasUserEntry: !!userEntry,
          hasWorkoutDays
        });
        
        setShowSetup(setupIncomplete);
      } catch (error) {
        console.error('Error checking setup status:', error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkSetupStatus();
  }, [user]);
  
  if (isChecking || !user) {
    return null;
  }
  
  return (
    <>
      {showSetup && userId && (
        <PostSignupSetup
          isOpen={showSetup}
          onClose={() => setShowSetup(false)}
          userId={userId}
          forceComplete={true}
        />
      )}
    </>
  );
}