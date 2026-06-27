import React from 'react';
import SupportHero from '@/components/SupportHero';
import StatsSection from '@/components/StatsSection';
import DonationForm from '@/components/DonationForm';
import ContributorWall from '@/components/ContributorWall';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Donation } from '@/types';

// Force dynamic rendering to always fetch fresh statistics and wall entries on page load
export const revalidate = 0;

export default async function SupportPage() {
  let totalSupporters = 0;
  let totalAmountRaised = 0;
  let latestDonation: Donation | null = null;
  let initialSupporters: Donation[] = [];

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch aggregates & records simultaneously for optimal server-side rendering speed
    const [statsRes, latestRes, supportersRes] = await Promise.all([
      supabaseAdmin.from('donations').select('amount').eq('status', 'success'),
      supabaseAdmin.from('donations').select('*').eq('status', 'success').order('created_at', { ascending: false }).limit(1),
      supabaseAdmin.from('donations').select('*').eq('status', 'success').order('created_at', { ascending: false }).limit(30),
    ]);

    if (statsRes.data) {
      totalSupporters = statsRes.data.length;
      totalAmountRaised = statsRes.data.reduce((sum, d) => sum + Number(d.amount), 0);
    }

    if (latestRes.data && latestRes.data.length > 0) {
      latestDonation = latestRes.data[0] as Donation;
    }

    if (supportersRes.data) {
      initialSupporters = supportersRes.data as Donation[];
    }
  } catch (error) {
    // Graceful fallback to default mock/empty values if Supabase isn't fully wired or is offline
    console.error('Server failed to fetch Supabase donation datasets:', error);
  }

  const initialStats = {
    totalSupporters,
    totalAmountRaised,
    latestDonation,
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col justify-between pb-10">
      {/* Background Ambient Lighting Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0e_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full relative z-10">
        {/* Hero Section */}
        <SupportHero />

        {/* Statistics Bar */}
        <StatsSection initialStats={initialStats} />

        {/* Donation Form Widget */}
        <DonationForm />

        {/* Contributor Wall */}
        <ContributorWall initialSupporters={initialSupporters} />
      </div>

      {/* Modern Premium Footer */}
      <footer className="w-full text-center py-6 border-t border-white/[0.04] max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 text-xs font-semibold text-zinc-500">
        <div>&copy; {new Date().getFullYear()} DeepFocus. Open source and self-funded.</div>
        <div className="flex gap-4">
          <a href="https://github.com/Saicharan-775/DeepFocus" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
          <span className="text-zinc-800">/</span>
          <a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
          <span className="text-zinc-800">/</span>
          <a href="mailto:support.deepfocus@gmail.com" className="hover:text-zinc-300 transition-colors">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
