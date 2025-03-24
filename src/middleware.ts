import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a Supabase client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  try {
    // Get the authentication session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Don't redirect on auth routes or setup route, as they're part of the auth/onboarding flow
    if (request.nextUrl.pathname.startsWith('/setup') || 
        request.nextUrl.pathname.startsWith('/auth')) {
      return res;
    }

    // If the user is signed in and trying to access auth pages, redirect to home
    if (session?.user) {
      if (request.nextUrl.pathname === '/auth' || request.nextUrl.pathname === '/auth/signup') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // Check if setup is complete for all users accessing the home page
      if (request.nextUrl.pathname === '/') {
        try {
          // Check if profile exists and is complete
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('template_preference, display_name')
            .eq('id', session.user.id)
            .single();
            
          // Check if there's a user in the users table
          const { data: userEntry, error: userError } = await supabase
            .from('users')
            .select('username')
            .eq('auth_id', session.user.id)
            .single();
            
          // If profile query had an error or profile doesn't exist, redirect to setup
          if (profileError || !profile) {
            console.log('Middleware: Profile not found, redirecting to setup');
            return NextResponse.redirect(new URL(`/setup?userId=${session.user.id}&force=true&reason=no_profile`, request.url));
          }
          
          // If template preference is null, redirect to setup
          if (profile.template_preference === null) {
            console.log('Middleware: Template preference not set, redirecting to setup');
            return NextResponse.redirect(new URL(`/setup?userId=${session.user.id}&force=true&reason=no_template`, request.url));
          }
          
          // If user entry doesn't exist, redirect to setup
          if (userError || !userEntry) {
            console.log('Middleware: User entry not found, redirecting to setup');
            return NextResponse.redirect(new URL(`/setup?userId=${session.user.id}&force=true&reason=no_user_entry`, request.url));
          }

          // Check if user_days exists for this user
          if (userEntry) {
            const { data: userDays, error: userDaysError } = await supabase
              .from('user_days')
              .select('id')
              .eq('username', userEntry.username)
              .limit(1);

            // If no user days are set up, redirect to setup
            if (userDaysError || !userDays || userDays.length === 0) {
              console.log('Middleware: No user days found, redirecting to setup');
              return NextResponse.redirect(new URL(`/setup?userId=${session.user.id}&force=true&reason=no_user_days`, request.url));
            }
          }
        } catch (error) {
          console.error('Error in middleware checking setup status:', error);
          // If there's an error, still let the user access the home page
          // The setup component can handle recovering from this state
        }
      }
    } else if (request.nextUrl.pathname === '/') {
      // If user is not authenticated and trying to access the home page,
      // let them through - the UI will show login prompt
    }
  } catch (error) {
    console.error('Middleware error:', error);
    // If there's any error in the middleware, just continue to the page
    // Better to let the page handle errors than to break navigation
  }

  return res;
}

export const config = {
  matcher: ['/', '/auth', '/auth/signup', '/setup'],
}; 