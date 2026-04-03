import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User, X, ChevronDown, Github, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AuthPage() {
  const [mode, setMode] = useState('signup'); // 'signup' or 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: '', // Optional: Add default metadata if needed
            }
          }
        });

        if (error) throw error;

        // Note: With "Email Enumeration Protection" ON, Supabase returns 
        // a user even if already registered. We check if identities are empty.
        if (data?.user?.identities?.length === 0) {
           setError('An account with this email already exists and is confirmed. Try signing in instead.');
           return;
        }

        setSuccessMessage('Verification link sent! Please check your email inbox.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message === 'Invalid login credentials') {
            setError('Invalid email or password. Please try again.');
          } else {
            throw error;
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
     await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleGithubLogin = async () => {
     await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[380px] bg-[#0F0F0F] border border-white/5 rounded-[28px] p-7 shadow-2xl relative z-10"
      >
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-black/40 p-1 rounded-full flex gap-1 border border-white/5">
            <button 
              onClick={() => setMode('signup')}
              className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'signup' ? 'bg-[#222222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sign up
            </button>
            <button 
              onClick={() => setMode('signin')}
              className={`px-5 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'signin' ? 'bg-[#222222] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sign in
            </button>
          </div>
          <Link 
            to="/"
            className="w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center hover:bg-[#333333] transition border border-white/5"
          >
            <X size={14} className="text-gray-400" />
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {!successMessage ? (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <h2 className="text-2xl font-semibold mb-6 tracking-tight">
                {mode === 'signup' ? 'Create an account' : 'Welcome back'}
              </h2>

              <form onSubmit={handleAuth} className="space-y-3.5">
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-300 transition" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full bg-[#161616] border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition hover:bg-[#1a1a1a]"
                  />
                </div>

                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-gray-300 transition" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-[#161616] border border-white/5 rounded-xl pl-11 pr-12 py-3.5 text-sm focus:outline-none focus:border-white/20 transition hover:bg-[#1a1a1a]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-3 py-2.5 rounded-xl font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:opacity-90 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-2 shadow-lg"
                >
                  {loading ? 'Processing...' : (mode === 'signup' ? 'Create account' : 'Sign in')}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success-message"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="text-emerald-400" size={28} />
              </div>
              <h2 className="text-2xl font-semibold mb-3 tracking-tight text-white">Check your email</h2>
              <p className="text-gray-400 text-sm leading-relaxed px-4">
                We've sent a verification link to <span className="text-gray-200 font-medium">{email}</span>. Please click it to activate your account.
              </p>
              <button 
                onClick={() => setSuccessMessage(null)}
                className="mt-8 text-xs text-gray-500 hover:text-white transition font-medium"
              >
                ← Back to login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative my-8 text-center px-4">
           <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -z-10" />
           <span className="bg-[#111111] px-4 text-[10px] text-gray-500 uppercase tracking-widest font-medium">OR SIGN IN WITH</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleGoogleLogin}
            className="flex items-center justify-center py-4 bg-[#181818] border border-white/5 rounded-2xl hover:bg-[#222222] transition group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button 
            onClick={handleGithubLogin}
            className="flex items-center justify-center py-4 bg-[#181818] border border-white/5 rounded-2xl hover:bg-[#222222] transition group"
          >
            <Github size={20} className="text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] text-gray-500 font-medium">
          By creating an account, you agree to our <span className="text-gray-400 cursor-pointer hover:underline">Terms & Service</span>
        </p>
      </motion.div>
    </div>
  );
}
