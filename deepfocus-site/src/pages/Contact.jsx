import React from 'react';
import { Mail, Github, HelpCircle } from 'lucide-react';

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-zinc-300 font-sans leading-relaxed selection:bg-violet-500/30">
      <div className="text-center mb-16">
        <h1 className="font-['Cormorant_Garamond',serif] text-4xl sm:text-5xl md:text-6xl text-white font-light tracking-tight mb-4">
          Contact Us
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-400 font-semibold">
          Get in touch with the DeepFocus team
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        
        {/* Support Channel 1: Email */}
        <div className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 w-fit">
              <Mail size={24} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">Direct Support</h3>
            <p className="text-zinc-400 text-sm">
              Have questions about database encryption, data export compliance, billing, or general inquiries? Email our support mailbox. We aim to respond within 24-48 hours.
            </p>
          </div>
          <div className="mt-8">
            <a 
              href="mailto:support.deepfocus@gmail.com" 
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 font-bold transition-all text-xs cursor-pointer shadow-lg"
            >
              support.deepfocus@gmail.com
            </a>
          </div>
        </div>

        {/* Support Channel 2: GitHub & Technical issues */}
        <div className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 w-fit">
              <Github size={24} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">GitHub Repository</h3>
            <p className="text-zinc-400 text-sm">
              DeepFocus is open-source. For technical issues, bug reports, feature suggestions, or styling requests, please submit an issue directly on our GitHub page.
            </p>
          </div>
          <div className="mt-8">
            <a 
              href="https://github.com/Saicharan-775/DeepFocus/issues" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white hover:bg-white/[0.08] font-bold transition-all text-xs cursor-pointer"
            >
              Open GitHub Issues
            </a>
          </div>
        </div>

      </div>

      {/* Frequently Asked Questions Prompt */}
      <section className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl flex gap-4 items-start">
        <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 shrink-0">
          <HelpCircle size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Need immediate assistance?</h3>
          <p className="text-sm text-zinc-400">
            For setup instructions, extension sync troubleshooting, or to learn more about timer guidelines, check out the{' '}
            <a href="/guide" className="text-violet-400 hover:text-violet-300 underline transition-colors">
              DeepFocus Guide
            </a>.
          </p>
        </div>
      </section>

    </div>
  );
}
