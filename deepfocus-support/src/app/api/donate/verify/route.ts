import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // 1. Validate parameters
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment signature verification parameters.' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('Razorpay secret is missing on the server.');
      return NextResponse.json(
        { error: 'Payment gateway configuration missing.' },
        { status: 500 }
      );
    }

    // 2. Cryptographic verification of signature
    // Razorpay signature scheme: HMAC-SHA256 of "order_id|payment_id" using key secret
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    const isVerified = expectedSignature === razorpay_signature;

    const supabaseAdmin = getSupabaseAdmin();

    if (isVerified) {
      // 3. Update donation status to successful in Database
      const { data, error: dbError } = await supabaseAdmin
        .from('donations')
        .update({
          status: 'success',
          signature_verified: true,
          payment_id: razorpay_payment_id,
        })
        .eq('order_id', razorpay_order_id)
        .select()
        .single();

      if (dbError) {
        console.error('Database update failed for verified order:', dbError);
        return NextResponse.json(
          { error: 'Failed to record donation completion.' },
          { status: 500 }
        );
      }

      if (!data) {
        console.error(`Order ID ${razorpay_order_id} not found in database.`);
        return NextResponse.json(
          { error: 'Donation order registry not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and registered successfully.',
        donation: data,
      });
    } else {
      // 4. Mark signature verification failed in Database
      console.warn(`Signature verification failed for order ${razorpay_order_id}`);
      
      await supabaseAdmin
        .from('donations')
        .update({
          status: 'failed',
          signature_verified: false,
          payment_id: razorpay_payment_id,
        })
        .eq('order_id', razorpay_order_id);

      return NextResponse.json(
        { error: 'Cryptographic signature mismatch. Verification failed.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay signature:', error);
    return NextResponse.json(
      { error: error?.message || 'Verification workflow crashed.' },
      { status: 500 }
    );
  }
}
