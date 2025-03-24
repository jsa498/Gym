import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // If there's an error, redirect to home with error params
  if (error) {
    console.error(`Auth callback received error: ${error} - ${errorDescription}`);
    return NextResponse.redirect(
      new URL(`/?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError);
      throw sessionError;
    }
    
    if (!session?.user) {
      console.error('No user in session after code exchange');
      throw new Error('No user in session');
    }

    // Log user details for debugging
    console.log('User authenticated:', {
      id: session.user.id,
      email: session.user.email,
      provider: session.user.app_metadata?.provider
    });

    // Enhanced error handling for profiles table operations
    try {
      // Wait 500ms to ensure auth tables have completed their updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try up to 3 times to create the profile
      let retryCount = 0;
      let profileCreated = false;
      
      while (!profileCreated && retryCount < 3) {
        try {
          // Check if user exists in profiles table
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error(`Profile check attempt ${retryCount + 1} failed:`, profileError);
          }

          // If profile doesn't exist, create it
          if (!existingProfile) {
            const displayName = session.user.user_metadata?.name || 
                              session.user.user_metadata?.full_name || 
                              session.user.email?.split('@')[0] ||
                              'user';
                              
            console.log(`Creating profile, attempt ${retryCount + 1}, display name: ${displayName}`);
            
            const { error: insertProfileError } = await supabase
              .from('profiles')
              .upsert({ 
                id: session.user.id,
                display_name: displayName,
                template_preference: null,  // Force setup
                has_buddy: false
              });
              
            if (insertProfileError) {
              console.error(`Profile creation attempt ${retryCount + 1} failed:`, insertProfileError);
              retryCount++;
              
              if (retryCount < 3) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else {
              console.log('Profile created successfully');
              profileCreated = true;
            }
          } else {
            console.log('Profile already exists:', existingProfile);
            profileCreated = true;
          }
        } catch (attemptErr) {
          console.error(`Profile creation attempt ${retryCount + 1} exception:`, attemptErr);
          retryCount++;
          
          if (retryCount < 3) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (profileErr) {
      console.error('Profile operation error:', profileErr);
      // Continue execution - we'll try users table next
    }

    // Enhanced error handling for users table operations
    try {
      // Wait 500ms to ensure profile operations have completed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try up to 3 times to create the user record
      let retryCount = 0;
      let userCreated = false;
      
      while (!userCreated && retryCount < 3) {
        try {
          // Check if user exists in users table 
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id, username')
            .eq('auth_id', session.user.id)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            console.error(`User check attempt ${retryCount + 1} failed:`, userError);
          }

          // If user doesn't exist in users table, create it
          if (!existingUser) {
            // First get the display name from profiles if it exists
            let displayName;
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', session.user.id)
                .single();
                
              displayName = profileData?.display_name;
            } catch (e) {
              // If profile fetch fails, fall back to email
              console.error('Error fetching profile for username:', e);
            }
            
            // Fall back to metadata or email if profile not found
            if (!displayName) {
              displayName = session.user.user_metadata?.name || 
                          session.user.user_metadata?.full_name || 
                          session.user.email?.split('@')[0] ||
                          'user';
            }
            
            console.log(`Creating user record, attempt ${retryCount + 1}, base username: ${displayName}`);
            
            // Generate a unique username if needed
            const username = displayName;
            let counter = 0;
            let insertSuccess = false;
            
            while (!insertSuccess && counter < 5) {
              try {
                const currentUsername = counter > 0 ? `${username}_${counter}` : username;
                
                const { error: insertUserError } = await supabase
                  .from('users')
                  .upsert({ 
                    username: currentUsername,
                    auth_id: session.user.id
                  });
                  
                if (insertUserError) {
                  if (insertUserError.code === '23505') { // Unique violation
                    counter++;
                    console.log(`Username ${currentUsername} exists, trying suffix ${counter}`);
                  } else {
                    console.error(`User creation error: ${insertUserError.message} (${insertUserError.code})`);
                    break;
                  }
                } else {
                  insertSuccess = true;
                  userCreated = true;
                  console.log(`User created successfully with username: ${currentUsername}`);
                }
              } catch (insertErr) {
                console.error('User insert error:', insertErr);
                break;
              }
            }
            
            if (!insertSuccess) {
              retryCount++;
              if (retryCount < 3) {
                // Wait before retrying the whole process
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          } else {
            console.log('User already exists:', existingUser);
            userCreated = true;
          }
        } catch (attemptErr) {
          console.error(`User creation attempt ${retryCount + 1} exception:`, attemptErr);
          retryCount++;
          
          if (retryCount < 3) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (userErr) {
      console.error('User operation error:', userErr);
    }

    // Make sure the user has template_preference set to null to force setup
    try {
      await supabase
        .from('profiles')
        .update({ template_preference: null })
        .eq('id', session.user.id);
    } catch (e: unknown) {
      console.error('Error updating profile:', e);
    }

    // Simply redirect to setup
    return NextResponse.redirect(
      new URL(`/setup?userId=${session.user.id}&force=true`, requestUrl.origin)
    );
    
  } catch (err) {
    // Redirect to home with error
    console.error('Auth callback error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Authentication error';
    return NextResponse.redirect(
      new URL(`/?error=server_error&error_description=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }
}