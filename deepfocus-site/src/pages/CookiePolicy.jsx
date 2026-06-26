import React from 'react';
import { Eye, Info, Database } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-zinc-300 font-sans leading-relaxed selection:bg-violet-500/30">
      <div className="text-center mb-16">
        <h1 className="font-['Cormorant_Garamond',serif] text-4xl sm:text-5xl md:text-6xl text-white font-light tracking-tight mb-4">
          Cookie Policy
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-400 font-semibold">
          Last Updated: June 26, 2026
        </p>
      </div>

      <div className="space-y-12">
        {/* Intro */}
        <section className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl">
          <p className="mb-4">
            This Cookie Policy explains how DeepFocus uses cookies and local browser storage to provide our developer focus environment.
          </p>
          <p>
            We believe in complete privacy. We <strong className="text-zinc-200">do not use any tracking, analytics, or behavioral advertising cookies</strong>.
          </p>
        </section>

        {/* 1. Essential Storage Only */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Database size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">1. Essential Local Storage Items</h2>
          </div>
          <p>
            Instead of standard third-party tracking cookies, DeepFocus uses secure local browser storage (such as `localStorage` and `chrome.storage.local`) to store local configurations:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-200">Session Tokens:</strong> To keep you authenticated, Supabase stores JWT auth tokens locally in your browser. These are essential for connecting your extension with the web dashboard.
            </li>
            <li>
              <strong className="text-zinc-200">User Configuration:</strong> Your focus timer duration preferences, collapsed widget states, and theme mode.
            </li>
            <li>
              <strong className="text-zinc-200">BYOK AI Keys:</strong> Your OpenRouter, Groq, or OpenAI API keys are stored solely in your local browser storage so the extension can make direct AI calls.
            </li>
          </ul>
        </section>

        {/* 2. Control & Deletion */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Eye size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">2. How to Manage Local Storage</h2>
          </div>
          <p>
            Since all parameters reside inside your browser context, you can erase all local data at any time:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>
              Signing out of the DeepFocus dashboard immediately purges all Supabase JWT auth tokens.
            </li>
            <li>
              Removing the extension from your browser automatically deletes all Chrome Local Storage database states.
            </li>
            <li>
              You can clear your browser's site cache or local storage through standard browser devtools or settings to remove any residual data.
            </li>
          </ul>
        </section>

        {/* 3. Contact */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Info size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">3. Inquiries</h2>
          </div>
          <p>
            If you have questions about our zero-cookie approach, contact us at{' '}
            <a href="mailto:support.deepfocus@gmail.com" className="text-violet-400 hover:text-violet-300 underline transition-colors">
              support.deepfocus@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
