'use client';

import { useState, useEffect } from 'react';
import { Check, CheckCircle2, Zap, Calendar, Users, Timer, Star, Shield, Award, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SubscriptionPlan {
  id: number;
  name: string;
  max_workout_days: number;
  price: number;
  description: string;
  features: {
    features: string[];
  };
  is_active: boolean;
}

export function SubscriptionPlans() {
  // Hard-code the plans rather than relying on database
  // Plans are defined here but not used directly as we're using hardcoded UI components
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const plans = [
    {
      id: 1,
      name: 'free',
      max_workout_days: 3,
      price: 0,
      description: 'Basic plan for casual workouts',
      features: { features: ['Up to 3 workout days', 'Basic workout tracking', 'Single user account'] },
      is_active: true
    },
    {
      id: 2,
      name: 'plus',
      max_workout_days: 999,
      price: 5,
      description: 'Perfect for regular gym-goers',
      features: { features: ['Unlimited workout days', 'Advanced workout tracking', 'Progress analytics', 'Priority support'] },
      is_active: true
    },
    {
      id: 3,
      name: 'pro',
      max_workout_days: 999,
      price: 25,
      description: 'For fitness enthusiasts and trainers',
      features: { features: ['All Plus features', 'AI workout recommendations', 'Personal trainer tools', 'Workout plan creation', 'Premium analytics'] },
      is_active: false
    }
  ];
  
  const [userPlan, setUserPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const { user } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  useEffect(() => {
    const fetchUserPlan = async () => {
      setIsLoading(true);
      try {
        // Only fetch user's current subscription plan
        if (user) {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('subscription_plan, subscription_updated_at')
            .eq('id', user.id)
            .single();

          if (userError && userError.code !== 'PGRST116') throw userError;
          
          if (userData) {
            setUserPlan(userData.subscription_plan || 'free');
          }
        }
      } catch (error) {
        console.error('Error fetching user subscription plan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPlan();
  }, [user]);

  // Function to refresh subscription data from the database
  const refreshSubscriptionData = async () => {
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
  };

  const handleUpgrade = async (planName: string) => {
    if (!user) return;
    
    // Set the plan being upgraded to
    setUpgrading(planName);
    
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
        
        // Wait for database update to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh subscription data from the database to ensure we have latest state
        await refreshSubscriptionData();
        
        setShowUpgradeDialog(true);
        setUpgrading(null);
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
          userEmail: user.email
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
        setUpgrading(null);
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
        setUpgrading(null);
        return;
      }
      
      // If it's a free plan, no need to redirect to Stripe
      if (free) {
        // Wait for database update to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh subscription data from the database to ensure we have latest state
        await refreshSubscriptionData();
        
        setShowUpgradeDialog(true);
        setUpgrading(null);
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
      setUpgrading(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-white">Loading subscription plans...</div>;
  }

  return (
    <div className="space-y-8 text-white">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the plan that best fits your workout needs. Upgrade anytime to access more features and enhance your fitness journey.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Free Plan */}
        <div className="relative border border-white/20 rounded-xl shadow-lg bg-white/5 backdrop-blur-sm flex flex-col h-full hover:scale-[1.01] hover:shadow-xl transition-all duration-200">
          {userPlan === "free" && (
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          )}
          
          <div className="px-6 pt-6 pb-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold">Free</h3>
              <Badge variant="outline" className="bg-slate-800/40 text-slate-300 border-slate-600">
                Free
              </Badge>
            </div>
            <p className="text-white/70 text-base mb-4">Basic plan for casual workouts</p>
            <div className="flex items-baseline mt-4">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-white/50 ml-1 text-base">/forever</span>
            </div>
          </div>
          
          <div className="px-6 py-4 flex-grow">
            <div className="border-t border-white/10 pt-4 mt-2">
              <p className="font-medium text-sm mb-3 text-white/80">What&apos;s included:</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-white/10 text-white/70">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">Up to 3 workout days</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-white/10 text-white/70">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">Basic workout tracking</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-white/10 text-white/70">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">Single user account</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="px-6 pb-6 pt-3">
            <Button 
              className="w-full h-11 font-medium text-base bg-white/20 hover:bg-white/30 text-white"
              disabled={userPlan === "free" || upgrading === "free"}
              onClick={() => handleUpgrade("free")}
            >
              {userPlan === "free" ? "Current Plan" : upgrading === "free" ? "Processing..." : "Downgrade"}
            </Button>
          </div>
        </div>
        
        {/* Plus Plan */}
        <div className="relative border border-primary/30 rounded-xl shadow-xl bg-primary/5 backdrop-blur-sm flex flex-col h-full scale-105 hover:scale-[1.07] transition-all duration-200">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Badge variant="default" className="bg-primary text-white rounded-full px-3">Popular</Badge>
          </div>
          
          {userPlan === "plus" && (
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          )}
          
          <div className="px-6 pt-8 pb-3"> {/* Extra padding at top for badge */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold">Plus</h3>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 rounded-full px-3">
                Popular
              </Badge>
            </div>
            <p className="text-white/70 text-base mb-4">Perfect for regular gym-goers</p>
            <div className="flex items-baseline mt-4">
              <span className="text-4xl font-extrabold">$5</span>
              <span className="text-white/50 ml-1 text-base">/month</span>
            </div>
          </div>
          
          <div className="px-6 py-4 flex-grow">
            <div className="border-t border-primary/20 pt-4 mt-2">
              <p className="font-medium text-sm mb-3 text-primary/90">What&apos;s included:</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-primary/10 text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/90">Unlimited workout days</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-primary/10 text-primary">
                    <Zap className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/90">Advanced workout tracking</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-primary/10 text-primary">
                    <Timer className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/90">Progress analytics</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-primary/10 text-primary">
                    <Star className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/90">Priority support</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="px-6 pb-6 pt-3">
            <Button 
              className="w-full h-11 font-medium text-base bg-primary hover:bg-primary/90"
              disabled={userPlan === "plus" || upgrading === "plus"}
              onClick={() => handleUpgrade("plus")}
            >
              {userPlan === "plus" ? "Current Plan" : upgrading === "plus" ? "Processing..." : "Upgrade"}
            </Button>
          </div>
        </div>
        
        {/* Pro Plan */}
        <div className="relative border border-purple-500/30 rounded-xl shadow-lg bg-gradient-to-br from-purple-500/5 to-blue-500/5 backdrop-blur-sm flex flex-col h-full hover:scale-[1.01] hover:shadow-xl transition-all duration-200">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3">
            <Badge variant="outline" className="bg-purple-600 text-white border-purple-400">Coming Soon</Badge>
          </div>
          
          <div className="px-6 pt-8 pb-3"> {/* Extra padding at top for badge */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-bold">Pro</h3>
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Premium
              </Badge>
            </div>
            <p className="text-white/70 text-base mb-4">For fitness enthusiasts and trainers</p>
            <div className="flex items-baseline mt-4">
              <span className="text-4xl font-extrabold">$25</span>
              <span className="text-white/50 ml-1 text-base">/month</span>
            </div>
          </div>
          
          <div className="px-6 py-4 flex-grow">
            <div className="border-t border-purple-500/20 pt-4 mt-2">
              <p className="font-medium text-sm mb-3 text-purple-400">What&apos;s included:</p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-purple-500/10 text-purple-400">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">All Plus features</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-purple-500/10 text-purple-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">AI workout recommendations</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-purple-500/10 text-purple-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">Personal trainer tools</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-purple-500/10 text-purple-400">
                    <Award className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">Workout plan creation</span>
                </li>
                <li className="flex items-start">
                  <div className="mr-2 p-1 rounded-full bg-purple-500/10 text-purple-400">
                    <Timer className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-white/80">Premium analytics</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="px-6 pb-6 pt-3">
            <Button 
              className="w-full h-11 font-medium text-base bg-purple-600/70 hover:bg-purple-600/90 opacity-80"
              disabled={upgrading === "pro"}
              onClick={() => handleUpgrade("pro")}
            >
              {upgrading === "pro" ? "Processing..." : "Coming Soon"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Need help choosing a plan?</h3>
            <p className="text-white/60 text-sm">Contact us for more information about our subscription plans.</p>
          </div>
          <Button variant="outline" className="whitespace-nowrap border-white/20 text-white hover:bg-white/10">
            Contact Support
          </Button>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
              Subscription Updated!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Your subscription has been successfully updated to the {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} plan.
              {userPlan === 'plus' && (
                <div className="mt-4 p-3 bg-primary/10 rounded-md text-sm">
                  <p className="font-medium text-primary mb-1">You now have access to:</p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      Unlimited workout days
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      Advanced workout tracking
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      Priority support
                    </li>
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button className="w-full sm:w-auto" onClick={() => setShowUpgradeDialog(false)}>
              Start Using Your Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for the upgrade modal that appears when users hit the day limit
export function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border border-white/20 shadow-xl rounded-xl p-0 overflow-hidden">
        {/* Top banner with lightning icon */}
        <div className="w-full bg-gradient-to-r from-white/10 to-white/5 py-5 relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-black p-3 rounded-full shadow-md">
            <Zap className="h-6 w-6" />
          </div>
          <DialogHeader className="pt-6 px-6">
            <DialogTitle className="text-2xl font-bold text-center text-white">
              Workout Day Limit Reached
            </DialogTitle>
            <DialogDescription className="text-center text-white/80 mt-2">
              You&apos;ve reached the maximum of 3 workout days on your free plan.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Main content */}
        <div className="px-6 py-4">
          {/* Premium plan card */}
          <div className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-white" /> 
                Plus Plan
              </h3>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3">
                Recommended
              </Badge>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Unlimited workout days</span>
              </li>
              <li className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Advanced workout tracking</span>
              </li>
              <li className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Progress analytics</span>
              </li>
              <li className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Priority support</span>
              </li>
            </ul>
          </div>
          
          {/* Price display */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl font-bold text-white">$5</span>
              <span className="text-sm text-white/60">/month</span>
            </div>
            <p className="text-white/60 text-sm mt-1">Cancel anytime • Instant access</p>
          </div>
          
          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              className="w-full py-6 text-base font-semibold bg-white text-black hover:bg-white/90 transition-all"
              onClick={() => window.location.href = '/settings/subscription'}
            >
              Upgrade to Plus
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full py-5 text-base bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 hover:text-white transition-all" 
              onClick={onClose}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}