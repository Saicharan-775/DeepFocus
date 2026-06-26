import React from 'react';
import { Trash2, AlertCircle, Info, Mail } from 'lucide-react';

export default function DataDeletionPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-zinc-300 font-sans leading-relaxed selection:bg-violet-500/30">
      <div className="text-center mb-16">
        <h1 className="font-['Cormorant_Garamond',serif] text-4xl sm:text-5xl md:text-6xl text-white font-light tracking-tight mb-4">
          Data Deletion Policy
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-400 font-semibold">
          Last Updated: June 26, 2026
        </p>
      </div>

      <div className="space-y-12">
        {/* Intro */}
        <section className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl flex gap-4 items-start">
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 shrink-0">
            <Trash2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Right to Erasure</h3>
            <p className="text-sm">
              DeepFocus fully respects your right to control your personal data. We offer a transparent, irreversible data deletion workflow so you can remove your presence from our platform at any time.
            </p>
          </div>
        </section>

        {/* 1. Self-Service Deletion */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-wide">1. Self-Service Account Deletion</h2>
          <p>
            The easiest way to purge all your data is using the self-service tool inside the web dashboard:
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-zinc-400">
            <li>
              Navigate to the <strong className="text-zinc-200">Settings</strong> page on the web dashboard.
            </li>
            <li>
              Scroll to the <strong className="text-zinc-200">Danger Zone</strong> section.
            </li>
            <li>
              Click the <strong className="text-rose-400">Delete Account Permanently</strong> button.
            </li>
            <li>
              Confirm the dialog prompt. The app will automatically sign you out and redirect you to the homepage.
            </li>
          </ol>
        </section>

        {/* 2. Deletion Scope */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <AlertCircle size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">2. Scope of Deletion (What gets removed)</h2>
          </div>
          <p>
            When you trigger the deletion workflow, a secure serverless script running on Vercel is invoked. It executes administrative database commands using a privileged service role client to completely remove the following:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>All saved revision notes, solutions, and code snippets in `revision_problems` table.</li>
            <li>Your entire focus history, sessions, and violations in `focus_sessions` and `focus_violations` tables.</li>
            <li>Secure extension tokens stored in `extension_connections` table.</li>
            <li>Your user authentication record and metadata in Supabase Auth admin system.</li>
          </ul>
          <p className="text-xs text-rose-400/90 font-mono mt-2 bg-rose-950/20 border border-rose-500/10 p-3 rounded-lg">
            WARNING: Account deletion is absolute and irreversible. There are no backups or restoration archives. Once deleted, your notes and session logs are gone forever.
          </p>
        </section>

        {/* 3. Manual Requests */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Mail size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">3. Manual Deletion Requests</h2>
          </div>
          <p>
            If you cannot log in to your account or need help with deletion, you can submit a manual deletion request:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>
              Email us at{' '}
              <a href="mailto:support.deepfocus@gmail.com" className="text-violet-400 hover:text-violet-300 underline transition-colors">
                support.deepfocus@gmail.com
              </a>{' '}
              with the subject line "Request Account Deletion".
            </li>
            <li>
              You must send the request from the email address associated with the DeepFocus account you want to delete.
            </li>
            <li>
              Once identity is verified, we will process the deletion and send you a confirmation email within 72 hours.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
