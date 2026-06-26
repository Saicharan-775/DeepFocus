import React from 'react';
import { Scale, BookOpen, AlertTriangle } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-zinc-300 font-sans leading-relaxed selection:bg-violet-500/30">
      <div className="text-center mb-16">
        <h1 className="font-['Cormorant_Garamond',serif] text-4xl sm:text-5xl md:text-6xl text-white font-light tracking-tight mb-4">
          Terms of Service
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-violet-400 font-semibold">
          Last Updated: June 26, 2026
        </p>
      </div>

      <div className="space-y-12">
        {/* Intro */}
        <section className="bg-white/[0.01] border border-white/[0.04] p-8 rounded-2xl">
          <p className="mb-4">
            Welcome to DeepFocus. These Terms of Service ("Terms") govern your use of the DeepFocus Chrome extension and the DeepFocus web application (collectively, the "Service").
          </p>
          <p>
            By accessing or using our Service, you agree to be bound by these Terms. If you do not agree, please do not install the extension or access the platform.
          </p>
        </section>

        {/* 1. Description of Service */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <BookOpen size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">1. Description of Service</h2>
          </div>
          <p>
            DeepFocus is a developer productivity platform designed to help users focus on algorithmic problem solving (such as LeetCode). Features include browser tab monitoring, solution block overlays, user analytics, and AI-driven code mistake summaries.
          </p>
        </section>

        {/* 2. User Accounts & Responsibilities */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Scale size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">2. User Account Security</h2>
          </div>
          <p>
            To use the web synchronization features, you must register an account. You are solely responsible for:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>Maintaining the confidentiality of your credentials.</li>
            <li>All activities, data entries, and API configurations linked to your account.</li>
            <li>Providing accurate email information.</li>
          </ul>
        </section>

        {/* 3. Acceptable Use and Restrictions */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-wide">3. Acceptable Use Policies</h2>
          <p>
            You agree to use DeepFocus strictly for self-improvement and focused problem solving. You agree not to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>Attempt to bypass, hack, or disable the focus overlay block without ending the focus timer legitimately.</li>
            <li>Exploit or flood our serverless API endpoints (e.g., feedback or telemetry routes).</li>
            <li>Inject malicious scripts, exploit vulnerabilities, or crawl our platform.</li>
            <li>Use the Chrome extension in a way that violates LeetCode's official Terms of Service.</li>
          </ul>
        </section>

        {/* 4. Bring-Your-Own-Key AI Responsibilities */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-wide">4. Bring-Your-Own-Key (BYOK) AI Costs</h2>
          <p>
            AI mistake analysis features rely on API keys provided by you (OpenRouter, Groq, or OpenAI). By configuring these keys, you understand and agree that:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-zinc-400">
            <li>You are directly responsible for any API usage fees charged by those AI providers.</li>
            <li>DeepFocus has no liability for billing, timeouts, rate-limits, or key expirations imposed by external AI vendors.</li>
          </ul>
        </section>

        {/* 5. Limitation of Liability */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">5. Disclaimer & Limitation of Liability</h2>
          </div>
          <p className="italic text-zinc-400">
            DeepFocus is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding system uptime, LeetCode compatibility, or the accuracy of AI mistake reviews.
          </p>
          <p>
            To the maximum extent permitted by law, DeepFocus, its contributors, or creators will not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the extension or web platform, including but not limited to contest failure, coding environment disruption, or loss of account credentials.
          </p>
        </section>

        {/* 6. Contact */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-wide">6. Contacting Us</h2>
          <p>
            If you have questions about these Terms, please contact{' '}
            <a href="mailto:support.deepfocus@gmail.com" className="text-violet-400 hover:text-violet-300 underline transition-colors">
              support.deepfocus@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
