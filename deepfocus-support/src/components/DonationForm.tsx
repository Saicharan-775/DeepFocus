'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, User, Mail, MessageSquare, ShieldCheck, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const PRESETS = [
  { id: 'coffee', label: '☕ Buy a Coffee', amount: 99 },
  { id: 'development', label: '🚀 Support Development', amount: 299 },
  { id: 'growing', label: '💙 Keep Growing', amount: 499 },
  { id: 'sponsor', label: '🔥 Sponsor DeepFocus', amount: 999 },
];

export default function DonationForm() {
  const [selectedPreset, setSelectedPreset] = useState<string>('coffee');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [anonymous, setAnonymous] = useState<boolean>(false);

  // Status and feedback states
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const activeAmount = selectedPreset === 'custom' ? Number(customAmount) : (PRESETS.find(p => p.id === selectedPreset)?.amount || 0);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setStatusMessage(null);
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    // 1. Validation
    if (activeAmount < 10 || activeAmount > 100000) {
      setStatusMessage({
        type: 'error',
        text: 'Donation amount must be between ₹10 and ₹1,000,000.',
      });
      setLoading(false);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid email address.',
      });
      setLoading(false);
      return;
    }

    // 2. Load Razorpay library
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setStatusMessage({
        type: 'error',
        text: 'Failed to load Razorpay. Check your internet connection.',
      });
      setLoading(false);
      return;
    }

    try {
      // 3. Call Server Endpoint to Create Order
      const res = await fetch('/api/donate/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: activeAmount,
          name: name || null,
          email: email || null,
          message: message || null,
          anonymous,
        }),
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment order.');
      }

      // 4. Configure Razorpay Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DeepFocus',
        description: 'Thank you for supporting independent developer tools.',
        image: '/favicon.ico',
        order_id: orderData.id,
        prefill: {
          name: name || '',
          email: email || '',
        },
        theme: {
          color: '#7c3aed', // violet 600
        },
        handler: async function (response: any) {
          // 5. Verification Endpoint after success checkout
          setLoading(true);
          try {
            const verifyRes = await fetch('/api/donate/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setStatusMessage({
                type: 'success',
                text: 'Payment verified! Thank you so much for supporting DeepFocus. ❤️',
              });
              // Reset state
              setCustomAmount('');
              setName('');
              setEmail('');
              setMessage('');
            } else {
              throw new Error(verifyData.error || 'Signature verification failed.');
            }
          } catch (verifyErr: any) {
            setStatusMessage({
              type: 'error',
              text: verifyErr.message || 'Verification failed. Contact support if debited.',
            });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setStatusMessage({
              type: 'info',
              text: 'Payment cancelled.',
            });
          },
        },
      };

      // 6. Open checkout modal
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setLoading(false);
        setStatusMessage({
          type: 'error',
          text: resp.error.description || 'Payment failed.',
        });
      });
      rzp.open();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Payment pipeline error.',
      });
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="max-w-2xl mx-auto px-6 mb-20"
    >
      <div className="border border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top subtle glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        {/* Preset Cards Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                selectedPreset === preset.id
                  ? 'border-violet-500 bg-violet-500/5 text-white shadow-[0_0_15px_rgba(124,58,237,0.05)]'
                  : 'border-white/[0.04] bg-white/[0.01] text-zinc-400 hover:border-white/10 hover:text-zinc-200'
              }`}
            >
              <span className="text-xs font-semibold">{preset.label}</span>
              <span className="text-sm font-black text-white">₹{preset.amount}</span>
            </button>
          ))}
        </div>

        {/* Custom Amount Selector Toggle */}
        <button
          type="button"
          onClick={() => handlePresetSelect('custom')}
          className={`w-full p-4 rounded-xl border text-center transition-all mb-6 cursor-pointer ${
            selectedPreset === 'custom'
              ? 'border-violet-500 bg-violet-500/5 text-white'
              : 'border-white/[0.04] bg-white/[0.01] text-zinc-400 hover:border-white/10 hover:text-zinc-200'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">Custom Amount</span>
        </button>

        <form onSubmit={handleDonate} className="space-y-5">
          {/* Custom Amount input field if selected */}
          {selectedPreset === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-500">₹</span>
                <input
                  type="number"
                  required
                  min={10}
                  max={100000}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount between 10 and 100,000"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm font-semibold focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </motion.div>
          )}

          {/* Form Fields: Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Your Name (Optional)
              </label>
              <div className="relative">
                <User size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={anonymous}
                  placeholder={anonymous ? 'Anonymous' : 'e.g. Alex Rivera'}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@rivera.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Optional Message */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex justify-between">
              <span>Message (Optional)</span>
              <span className="text-[9px] text-zinc-650">{message.length}/200</span>
            </label>
            <div className="relative">
              <MessageSquare size={13} className="absolute left-4 top-3.5 text-zinc-500" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="Write a message of support..."
                rows={3}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Anonymous Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group py-1">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="rounded border-white/10 bg-black text-violet-600 focus:ring-violet-500/20"
            />
            <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
              Donate anonymously (Hide name on the wall)
            </span>
          </label>

          {/* Feedback messages */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl border text-xs flex gap-3 ${
                statusMessage.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : statusMessage.type === 'error'
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                  : 'border-white/10 bg-white/5 text-zinc-400'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
              )}
              <span className="font-semibold leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Button Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/5"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="border-t-transparent border-zinc-500" />
                Processing Secure Order...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Support DeepFocus (₹{activeAmount})
                <ArrowRight size={14} className="ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
