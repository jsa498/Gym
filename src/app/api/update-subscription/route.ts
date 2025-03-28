import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { userId, plan } = await request.json();
    
    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'User ID and plan are required' },
        { status: 400 }
      );
    }
    
    // Validate the plan exists
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('name')
      .eq('name', plan)
      .single();
      
    if (planError || !planData) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }
    
    // Update user's subscription in the database
    const { error: updateError, data: updateData } = await supabase
      .from('profiles')
      .update({
        subscription_plan: plan,
        subscription_updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('subscription_plan');
    
    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription: ' + updateError.message },
        { status: 500 }
      );
    }
    
    if (!updateData || updateData.length === 0) {
      return NextResponse.json(
        { error: 'No profile was updated' },
        { status: 404 }
      );
    }
    
    // Verify the update was successful
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', userId)
      .single();
      
    if (verifyError) {
      console.error('Verification error:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify subscription update: ' + verifyError.message },
        { status: 500 }
      );
    }
    
    if (verifyData.subscription_plan !== plan) {
      return NextResponse.json(
        { error: 'Subscription update failed verification' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      plan: verifyData.subscription_plan
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error updating subscription' },
      { status: 500 }
    );
  }
} 