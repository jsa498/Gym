'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AuthError } from '@supabase/supabase-js';
import { PostSignupSetup } from '@/components/post-signup-setup';

export default function ImprovedSignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const router = useRouter();

  // A more robust signup function that doesn't rely on DB triggers
  const handleImprovedSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First sign up the user with Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?setup=true&force=true`,
        },
      });
      
      if (error) throw error;
      
      if (data.user) {
        console.log("User signed up successfully:", data.user.id);
        
        try {
          // Manually create the user profile
          const displayName = data.user.user_metadata?.name || 
                              data.user.email?.split('@')[0] || 
                              'user';
                              
          // Insert into profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: data.user.id,
              display_name: displayName,
              template_preference: null, // Force setup flow
              has_buddy: false,
              buddy_name: null
            }, { onConflict: 'id' });
            
          if (profileError) {
            console.error("Error creating profile:", profileError);
          }
          
          // Try to insert with unique username
          const username = displayName;
          let counter = 0;
          let insertSuccess = false;
          
          while (!insertSuccess && counter < 5) {
            const currentUsername = counter > 0 ? `${username}_${counter}` : username;
            
            const { error: userError } = await supabase
              .from('users')
              .upsert({ 
                username: currentUsername,
                auth_id: data.user.id
              }, { onConflict: 'auth_id' });
              
            if (userError) {
              if (userError.code === '23505') { // Unique violation
                counter++;
                console.log(`Username ${currentUsername} exists, trying again`);
              } else {
                console.error("Error creating user:", userError);
                break;
              }
            } else {
              insertSuccess = true;
              console.log(`User created with username: ${currentUsername}`);
            }
          }
          
          // Show the setup dialog immediately
          setNewUserId(data.user.id);
          setShowSetupDialog(true);
          setIsLoading(false);
          
        } catch (err) {
          console.error("Error in manual signup process:", err);
          setError("Error during account setup. Please try again.");
          setIsLoading(false);
        }
      }
    } catch (err: unknown) {
      const error = err as AuthError;
      setError(error.message || 'An error occurred during sign up');
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?setup=true&signup=true&force=true`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          }
        },
      });
      
      if (error) throw error;
    } catch (err: unknown) {
      const error = err as AuthError;
      setError(error.message || 'An error occurred during Google sign up');
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="w-full max-w-sm space-y-6 relative">
          <button 
            onClick={() => router.push('/')}
            className="absolute -left-12 top-0 p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            aria-label="Back to Workout"
            title="Back to Workout Tracker"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-sm text-white/70">
              Enter your details to create your account
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-md text-sm text-white">
              {error}
            </div>
          )}

          <form onSubmit={handleImprovedSignUp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                placeholder="Enter your email"
                type="email"
                required
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                placeholder="Create a password"
                type="password"
                required
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                placeholder="Confirm your password"
                type="password"
                required
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-white/90"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black px-2 text-white/70">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            disabled={isLoading}
            className="w-full bg-[#18181B] border border-white/10 text-white hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2 h-11"
            onClick={handleGoogleSignUp}
          >
            <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </Button>

          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth" className="text-white hover:text-blue-400 font-medium transition-colors duration-200 hover:brightness-125">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {showSetupDialog && newUserId && (
        <PostSignupSetup
          isOpen={showSetupDialog}
          onClose={() => setShowSetupDialog(false)}
          userId={newUserId}
        />
      )}
    </>
  );
}