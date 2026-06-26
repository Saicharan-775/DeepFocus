import React from 'react';
import { Shield, Lock, Eye, Brain } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-zinc-300 font-sans leading-relaxed selection:bg-violet-500/30">
      <div className="text-center mb-16">
        <h1 className="font-['Cormorant_Garamond',serif] text-4xl sm:text-5xl md:text-6xl text-white font-light tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-400 font-semibold">
          Last Updated: June 26, 2026
        </p>
      </div>

      <div className="space-y-12">
        {/* Intro */}
        <section className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl">
          <p className="mb-4">
            DeepFocus ("we," "our," or "us") is dedicated to protecting your privacy. This Privacy Policy details how we handle user data in compliance with the General Data Protection Regulation (GDPR), Chrome Web Store developer guidelines, and industry-standard security principles.
          </p>
          <p>
            By installing the DeepFocus Chrome extension and using the DeepFocus web application, you consent to the data collection and usage practices described herein.
          </p>
        </section>

        {/* 1. Data Collection */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Shield size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">1. Data We Collect</h2>
          </div>
          <p>
            DeepFocus only collects data necessary to provide and improve our focus timer, solution blocking, and mistake analysis features. This includes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Account Details:</strong> Email addresses and user authentication metadata managed securely through Supabase Auth.
            </li>
            <li>
              <strong className="text-zinc-200">Focus Statistics:</strong> Focus session duration, attempted LeetCode problem titles/URLs, tab switch counts, and calculated focus scores.
            </li>
            <li>
              <strong className="text-zinc-200">Revision Notes:</strong> Code attempts, optimal solutions, mental models, and user notes saved within your revision workspace.
            </li>
          </ul>
        </section>

        {/* 2. Database & Data Storage */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Lock size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">2. Data Storage & Security</h2>
          </div>
          <p>
            All user data, statistics, and notes are stored on managed, encrypted-at-rest database infrastructure provided by <strong className="text-zinc-200">Supabase</strong>.
          </p>
          <p>
            We implement strict Row Level Security (RLS) policies on database tables. This mathematically guarantees that authenticated users can only view, write, or delete their own data, preventing unauthorized cross-user access.
          </p>
        </section>

        {/* 3. AI Transparency */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Brain size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">3. Bring-Your-Own-Key (BYOK) AI Transparency</h2>
          </div>
          <p>
            DeepFocus employs a "Bring-Your-Own-Key" (BYOK) model for advanced AI mistake analysis.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>
              Your OpenRouter, Groq, or OpenAI API keys are stored <strong className="text-zinc-200">exclusively inside your local browser context</strong> using secure local storage.
            </li>
            <li>
              AI calls are dispatched directly from your browser to the respective AI provider. Your API keys are <strong className="text-zinc-200">never</strong> sent to or stored on DeepFocus servers.
            </li>
            <li>
              The AI providers process your code submissions and question text strictly to return mistake analysis. Please check the privacy policies of OpenRouter, Groq, and OpenAI for details on their data retention policies.
            </li>
          </ul>
        </section>

        {/* 4. Data Sharing & Third-Party Disclosure */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Eye size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">4. Zero Data Selling Policy</h2>
          </div>
          <p>
            We maintain a strict stance against commercializing user data. We <strong className="text-zinc-200">never sell, rent, license, or share</strong> your personal details, notes, code, or analytics history with third-party advertisers, data brokers, or marketing networks.
          </p>
        </section>

        {/* 5. User Rights (GDPR & CWS) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-wide">5. Your GDPR and Compliance Rights</h2>
          <p>
            Under GDPR and Chrome Web Store policies, you have complete control over your data. DeepFocus provides self-service features in your Settings panel:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Right to Portability (Export):</strong> You can export all your revision notes, focus sessions, and statistics in a standardized JSON file.
            </li>
            <li>
              <strong className="text-zinc-200">Right to Erasure (Deletion):</strong> You can delete your account at any time. Clicking "Delete Account" triggers a server-side routine that instantly wipes all database records (notes, history, tokens) associated with your user ID and deletes your auth credentials.
            </li>
          </ul>
        </section>

        {/* 6. Contact */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-wide">6. Contact Information</h2>
          <p>
            For privacy inquiries or technical support, please contact us at{' '}
            <a href="mailto:support.deepfocus@gmail.com" className="text-violet-400 hover:text-violet-300 underline transition-colors">
              support.deepfocus@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
