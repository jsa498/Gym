import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Check if Stripe key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

// Initialize Supabase client - use anon key as fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { planId, userId, userEmail } = await request.json();
    
    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Plan ID and user ID are required' },
        { status: 400 }
      );
    }
    
    // Verify the user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, subscription_plan')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('User verification error:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Define URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const successUrl = `${origin}/settings/subscription?success=true`;
    const cancelUrl = `${origin}/settings/subscription?canceled=true`;
    
    // If we're downgrading to free, no payment needed
    if (planId === 'free') {
      // Only proceed if actually downgrading (not already on free plan)
      if (userData.subscription_plan === 'free') {
        return NextResponse.json({ 
          url: `${successUrl}&plan=free&userId=${userId}&timestamp=${Date.now()}`,
          free: true,
          message: 'Already on free plan'
        });
      }
      
      // Update the user's subscription immediately for free plan
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: 'free',
          subscription_updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('Free plan update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        url: `${successUrl}&plan=free&userId=${userId}&timestamp=${Date.now()}`,
        free: true 
      });
    }
    
    // For paid plans, create a Stripe checkout session
    // Set price based on plan
    if (planId === 'plus') {
      // For a real implementation, create products and prices in Stripe dashboard
      // and use their IDs here
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: userEmail, // Prefill the email field in checkout
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Workout Tracker Plus Subscription',
                  description: 'Unlimited workout days and advanced tracking',
                },
                unit_amount: 500, // $5.00
                recurring: {
                  interval: 'month',
                },
              },
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${successUrl}&plan=plus&userId=${userId}&timestamp=${Date.now()}`,
          cancel_url: cancelUrl,
          metadata: {
            userId: userId,
            plan: 'plus',
            current_plan: userData.subscription_plan
          },
          client_reference_id: userId,
        });

      return NextResponse.json({ url: session.url });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to create Stripe checkout session' },
          { status: 500 }
        );
      }
    } else if (planId === 'pro') {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: userEmail, // Prefill the email field in checkout
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Workout Tracker Pro Subscription',
                  description: 'All Plus features plus AI recommendations and trainer tools',
                },
                unit_amount: 2500, // $25.00
                recurring: {
                  interval: 'month',
                },
              },
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${successUrl}&plan=pro&userId=${userId}&timestamp=${Date.now()}`,
          cancel_url: cancelUrl,
          metadata: {
            userId: userId,
            plan: 'pro',
            current_plan: userData.subscription_plan
          },
          client_reference_id: userId,
        });

        return NextResponse.json({ url: session.url });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to create Stripe checkout session' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid plan selected' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more detailed error response
    let errorMessage = 'Error creating checkout session';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 