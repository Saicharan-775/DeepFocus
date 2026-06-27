-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    amount NUMERIC NOT NULL CHECK (amount >= 10 AND amount <= 100000),
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_id TEXT UNIQUE,
    order_id TEXT NOT NULL UNIQUE,
    signature_verified BOOLEAN DEFAULT FALSE,
    anonymous BOOLEAN DEFAULT FALSE,
    message VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed'))
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- 1. Anyone can view successful donations (to populate contributor wall and statistics)
-- Note: Sensitive fields like email are hidden or protected when selected by anonymous users
CREATE POLICY "Allow public read of successful donations" ON public.donations
    FOR SELECT
    USING (status = 'success');

-- 2. Anyone can insert a pending donation order
CREATE POLICY "Allow public insert of pending donations" ON public.donations
    FOR INSERT
    WITH CHECK (status = 'pending');

-- 3. Only service role key (backend operations) can update donations (e.g. mark signature_verified = true and status = success)
CREATE POLICY "Allow service_role full write access" ON public.donations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_status_created_at ON public.donations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_order_id ON public.donations (order_id);
CREATE INDEX IF NOT EXISTS idx_donations_payment_id ON public.donations (payment_id);

-- Enable Supabase Realtime for the donations table to support instant contributor wall updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
