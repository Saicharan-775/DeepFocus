import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amount, name, email, message, anonymous } = body;

    // 1. Server-side Input Validation
    const donationAmount = Number(amount);
    if (isNaN(donationAmount) || donationAmount < 10 || donationAmount > 100000) {
      return NextResponse.json(
        { error: 'Invalid donation amount. Min is ₹10 and Max is ₹100,000.' },
        { status: 400 }
      );
    }

    const sanitizedMessage = typeof message === 'string' ? message.trim().slice(0, 200) : null;
    const sanitizedName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 50) : null;
    const sanitizedEmail = typeof email === 'string' && email.trim() ? email.trim().slice(0, 100) : null;
    const isAnonymous = Boolean(anonymous);

    // Email format validation if provided
    if (sanitizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format.' },
        { status: 400 }
      );
    }

    // 2. Initialize Razorpay
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay API keys are missing on the server.');
      return NextResponse.json(
        { error: 'Payment gateway configuration error.' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 3. Create Razorpay Order
    // Amount is in paisa (1 INR = 100 paisa)
    const order = await razorpay.orders.create({
      amount: donationAmount * 100,
      currency: 'INR',
      receipt: `receipt_df_${Date.now()}`,
      notes: {
        supporter_name: isAnonymous ? 'Anonymous' : sanitizedName || 'Friend',
        message: sanitizedMessage || '',
      },
    });

    // 4. Save Pending Donation Record to Supabase
    const supabaseAdmin = getSupabaseAdmin();
    const { error: dbError } = await supabaseAdmin.from('donations').insert({
      name: isAnonymous ? null : sanitizedName,
      email: sanitizedEmail,
      amount: donationAmount,
      currency: 'INR',
      order_id: order.id,
      anonymous: isAnonymous,
      message: sanitizedMessage,
      status: 'pending',
    });

    if (dbError) {
      console.error('Failed to log pending donation in Supabase:', dbError);
      return NextResponse.json(
        { error: 'Database transaction failed.' },
        { status: 500 }
      );
    }

    // 5. Return Order Info to Client
    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
