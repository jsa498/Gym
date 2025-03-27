import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

export async function POST(request: Request) {
  try {
    const { planId, userId, userEmail } = await request.json();
    
    // Define plan details based on planId
    let priceId;
    let successUrl = `${request.headers.get('origin')}/settings/subscription?success=true`;
    let cancelUrl = `${request.headers.get('origin')}/settings/subscription?canceled=true`;
    
    // Set price based on plan
    if (planId === 'plus') {
      // For a real implementation, create products and prices in Stripe dashboard
      // and use their IDs here
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
        success_url: `${successUrl}&plan=plus&userId=${userId}`,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          plan: 'plus',
        },
      });

      return NextResponse.json({ url: session.url });
    } else if (planId === 'pro') {
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
        success_url: `${successUrl}&plan=pro&userId=${userId}`,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          plan: 'pro',
        },
      });

      return NextResponse.json({ url: session.url });
    }
    
    // If we're downgrading to free, no payment needed
    if (planId === 'free') {
      return NextResponse.json({ 
        url: `${successUrl}&plan=free&userId=${userId}`,
        free: true 
      });
    }

    return NextResponse.json(
      { error: 'Invalid plan selected' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
} 