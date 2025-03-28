'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { OnboardingCheck } from '@/components/onboarding-check';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWorkout } from '@/lib/workout-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { SubscriptionPlan } from '@/lib/types';
import { 
  CalendarIcon, 
  BarChartIcon, 
  SparklesIcon, 
  CheckIcon,
  CheckCircle2Icon,
  ZapIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

// Wrap the component with Suspense for useSearchParams
export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <SubscriptionPageContent />
    </Suspense>
  );
}

// Actual implementation moved to a separate component
function SubscriptionPageContent() {
  const { userDayCount, maxWorkoutDays, subscriptionPlan: contextPlan } = useWorkout();
  const [isLoading, setIsLoading] = useState(false);
  const [userPlan, setUserPlan] = useState(contextPlan);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch the user's current plan from the database
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_updated_at')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') throw userError;
        
        if (userData) {
          setUserPlan(userData.subscription_plan || 'free');
        }
      } catch (error) {
        console.error('Error fetching user subscription plan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPlan();
  }, [user]);

  // Function to refresh subscription data from the database using useCallback to avoid dependency issues
  const refreshSubscriptionData = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_updated_at')
        .eq('id', user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;
      
      if (userData) {
        setUserPlan(userData.subscription_plan || 'free');
      }
    } catch (error) {
      console.error('Error fetching user subscription plan:', error);
    }
  }, [user, setUserPlan]);
  
  // Check for URL parameters after Stripe checkout
  useEffect(() => {
    if (!user) return;
    
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const plan = searchParams.get('plan');
    const userId = searchParams.get('userId');
    
    if (success === 'true' && plan && userId === user.id) {
      // Update subscription in the database
      const updateSubscription = async () => {
        try {
          const response = await fetch('/api/update-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              plan,
            }),
          });
          
          if (!response.ok) {
            console.error(`Error updating subscription: ${response.status} ${response.statusText}`);
            let errorMessage = 'Failed to update subscription';
            try {
              const errorData = await response.json();
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (parseError) {
              console.error('Failed to parse error response:', parseError);
            }
            throw new Error(errorMessage);
          }
          
          // Wait for database update to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh subscription data from the database to ensure we have latest state
          await refreshSubscriptionData();
          
          setShowUpgradeDialog(true);
          toast({
            title: 'Subscription Updated',
            description: `You've successfully upgraded to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`,
          });
        } catch (error) {
          console.error('Error updating subscription:', error);
          toast({
            title: 'Error',
            description: 'Failed to update subscription. Please try again.',
            variant: 'destructive',
          });
        }
      };
      
      updateSubscription();
    } else if (canceled === 'true') {
      toast({
        title: 'Checkout Canceled',
        description: 'You have canceled the checkout process.',
      });
    }
  }, [searchParams, user, refreshSubscriptionData]);

  // Handle upgrading the user's subscription
  const handleUpgrade = async (planName: SubscriptionPlan) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // For free plan, no payment needed - just update directly
      if (planName === 'free') {
        const updateResponse = await fetch('/api/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            plan: planName,
          }),
        });
        
        if (!updateResponse.ok) {
          console.error(`Error updating subscription: ${updateResponse.status} ${updateResponse.statusText}`);
          let errorMessage = 'Failed to update subscription';
          try {
            const errorData = await updateResponse.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(errorMessage);
        }
        
        setUserPlan(planName);
        setShowUpgradeDialog(true);
        setIsLoading(false);
        return;
      }
      
      // For paid plans, redirect to Stripe checkout
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planName,
          userId: user.id,
          userEmail: user.email,
        }),
      });
      
      if (!response.ok) {
        console.error('API response error:', response.status, response.statusText);
        let errorMessage = 'Failed to create checkout session. Please try again.';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      const { url, error, free } = data;
      
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // If it's a free plan, no need to redirect to Stripe
      if (free) {
        setUserPlan(planName);
        setShowUpgradeDialog(true);
        setIsLoading(false);
        return;
      }
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again later.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container px-4 max-w-5xl mx-auto py-16 relative">
        {/* Back button - repositioned for better mobile visibility */}
        <div className="mb-8 flex justify-start">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
            aria-label="Back to Workout"
            title="Back to Workout Tracker"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        <OnboardingCheck>
          <div className="space-y-10">
            {/* Header - removed relative positioning and back button from here */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-white">Subscription Plans</h1>
              <p className="text-white/80 max-w-2xl mx-auto text-lg">
                Choose the plan that best fits your fitness journey. Upgrade anytime to unlock additional features.
              </p>
              
              {userPlan === 'free' && (
                <Badge variant="outline" className="mx-auto bg-white/10 text-white px-4 py-2 text-sm">
                  {userDayCount}/{maxWorkoutDays} workout days used
                </Badge>
              )}
            </div>
            
            <Separator className="bg-white/10" />
            
            {isLoading ? (
              <div className="text-center py-12 text-white">Loading subscription plans...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Free Plan */}
                <Card className={`border border-white/10 bg-black/40 ${userPlan === 'free' ? 'ring-2 ring-white' : ''} flex flex-col rounded-xl backdrop-blur-sm transform transition-all duration-200 hover:scale-[1.02] shadow-lg`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-bold text-white">Free</CardTitle>
                      {userPlan === 'free' && (
                        <CheckCircle2Icon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <CardDescription className="text-white/70">Basic plan for casual workouts</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-6">
                      <p className="text-4xl font-bold text-white">$0</p>
                      <p className="text-sm text-white/70">forever</p>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">Up to 3 workout days</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">Basic workout tracking</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">Single user account</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Button 
                      className="w-full bg-white text-black hover:bg-white/95 h-12 font-medium disabled:opacity-80 disabled:bg-white disabled:text-black rounded-lg"
                      disabled={userPlan === "free" || isLoading}
                      onClick={() => handleUpgrade("free")}
                    >
                      {userPlan === "free" ? "Current Plan" : isLoading ? "Processing..." : "Downgrade"}
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Plus Plan */}
                <Card className={`relative border border-white/10 bg-black/40 ${userPlan === 'plus' ? 'ring-2 ring-white' : ''} flex flex-col rounded-xl backdrop-blur-sm transform transition-all duration-200 hover:scale-[1.02] shadow-lg`}>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Badge className="bg-white text-black rounded-full px-3 py-0.5 text-xs font-medium shadow-md">
                      <ZapIcon className="h-3 w-3 mr-1" /> Popular
                    </Badge>
                  </div>
                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-bold text-white">Plus</CardTitle>
                      {userPlan === 'plus' && (
                        <CheckCircle2Icon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <CardDescription className="text-white/70">Perfect for regular gym-goers</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-6">
                      <p className="text-4xl font-bold text-white">$5</p>
                      <p className="text-sm text-white/70">per month</p>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-white" />
                        <span className="text-sm text-white">Unlimited workout days</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white" />
                        <span className="text-sm text-white">Advanced workout tracking</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <BarChartIcon className="h-5 w-5 text-white" />
                        <span className="text-sm text-white">Progress analytics</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white" />
                        <span className="text-sm text-white">Priority support</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Button 
                      className="w-full bg-white text-black hover:bg-white/95 h-12 font-medium disabled:opacity-80 disabled:bg-white disabled:text-black rounded-lg"
                      disabled={userPlan === "plus" || isLoading}
                      onClick={() => handleUpgrade("plus")}
                    >
                      {userPlan === "plus" ? "Current Plan" : isLoading ? "Processing..." : userPlan === "pro" ? "Downgrade" : "Upgrade"}
                    </Button>
                  </CardFooter>
                </Card>
                
                {/* Pro Plan */}
                <Card className={`border border-white/10 bg-black/40 ${userPlan === 'pro' ? 'ring-2 ring-white' : ''} flex flex-col rounded-xl backdrop-blur-sm transform transition-all duration-200 hover:scale-[1.02] shadow-lg`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-bold text-white">Pro</CardTitle>
                      {userPlan === 'pro' && (
                        <CheckCircle2Icon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <CardDescription className="text-white/70">For fitness enthusiasts and trainers</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-6">
                      <p className="text-4xl font-bold text-white">$25</p>
                      <p className="text-sm text-white/70">per month</p>
                    </div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">All Plus features</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <SparklesIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">AI workout recommendations</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">Personal trainer tools</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckIcon className="h-5 w-5 text-white/70" />
                        <span className="text-sm text-white">Workout plan creation</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Button 
                      className="w-full bg-white text-black hover:bg-white/95 h-12 font-medium disabled:opacity-80 disabled:bg-white disabled:text-black rounded-lg"
                      disabled={userPlan === "pro" || isLoading}
                      onClick={() => handleUpgrade("pro")}
                    >
                      {userPlan === "pro" ? "Current Plan" : isLoading ? "Processing..." : "Upgrade"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </OnboardingCheck>
      </div>
      
      {/* Success Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-black border border-white/20 text-white sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-white font-bold">Subscription Updated</DialogTitle>
            <DialogDescription className="text-white/70">
              Your subscription has been successfully updated to the {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              className="w-full bg-white text-black hover:bg-white/95 h-11 font-medium rounded-lg"
              onClick={() => setShowUpgradeDialog(false)}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}