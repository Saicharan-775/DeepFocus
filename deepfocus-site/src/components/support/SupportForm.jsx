import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coffee, Zap, Heart, Sliders, Check, AlertCircle, ShieldCheck, Lock
} from "lucide-react";

export const PRESETS = [
  { id: "coffee", Icon: Coffee, amount: 99, label: "Coffee" },
  { id: "pizza", Icon: Zap, amount: 299, label: "Boost" },
  { id: "lightning", Icon: Heart, amount: 499, label: "Founder" },
  { id: "custom", Icon: Sliders, amount: 0, label: "Custom" },
];

export default function SupportForm({
  selectedPreset,
  setSelectedPreset,
  customAmount,
  setCustomAmount,
  name,
  setName,
  email,
  setEmail,
  message,
  setMessage,
  anonymous,
  setAnonymous,
  loading,
  activeAmount,
  statusMessage,
  setStatusMessage,
  handleDonate,
}) {
  return (
    <div className="w-full max-w-[400px] bg-[#09090b] border border-zinc-800/80 rounded-[24px] p-6 shadow-2xl font-sans">
      <h2 className="text-[17px] font-semibold text-zinc-100 mb-5 flex items-center gap-2">
        Support the project <span className="text-rose-500">❤️</span>
      </h2>

      {/* Clean, single-row preset selector */}
      <div className="flex gap-2 mb-6">
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelectedPreset(preset.id);
                setStatusMessage(null);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-[14px] transition-all duration-200 border ${
                isSelected
                  ? "bg-[#7c3aed] border-[#7c3aed] text-white"
                  : "bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
              }`}
            >
              <preset.Icon 
                size={16} 
                className={`mb-1.5 ${isSelected ? "text-white" : "opacity-80"}`} 
              />
              <span className="text-[13px] font-semibold">
                {preset.id === "custom" ? "Custom" : `₹${preset.amount}`}
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleDonate} className="flex flex-col gap-3">
        
        {/* Custom Amount Field */}
        <AnimatePresence>
          {selectedPreset === "custom" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }} 
              exit={{ opacity: 0, height: 0 }} 
              className="overflow-hidden"
            >
              <div className="relative mb-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">₹</span>
                <input
                  type="number"
                  required 
                  min={10} 
                  max={100000}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter custom amount"
                  className="w-full pl-8 pr-4 py-3 bg-transparent border border-zinc-800 rounded-[12px] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Standard Inputs */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={anonymous}
          placeholder="Name or @twitter (optional)"
          className="w-full px-4 py-3 bg-transparent border border-zinc-800 rounded-[12px] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#7c3aed] disabled:opacity-30 transition-colors"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full px-4 py-3 bg-transparent border border-zinc-800 rounded-[12px] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#7c3aed] transition-colors"
        />

        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 150))}
            placeholder="Say something nice... (optional)"
            rows={3}
            className="w-full px-4 py-3 bg-transparent border border-zinc-800 rounded-[12px] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
          />
          <span className="absolute bottom-3 right-4 text-[10px] text-zinc-600 font-medium">
            {message.length}/150
          </span>
        </div>

        {/* Simple Checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer mt-1 w-max">
          <div className="relative flex items-center justify-center w-[18px] h-[18px]">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-full h-full rounded-[4px] border border-zinc-700 bg-transparent peer-checked:border-[#7c3aed] peer-checked:bg-[#7c3aed] transition-colors flex items-center justify-center">
              <Check size={12} strokeWidth={3} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-zinc-400 select-none">
            Make this private
          </span>
        </label>

        {/* Status Messages */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, height: 0 }} 
              className={`p-3 mt-2 rounded-[12px] text-[13px] flex gap-2 items-center ${
                statusMessage.type === "success" 
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {statusMessage.type === "error" ? (
                <AlertCircle size={16} className="shrink-0" />
              ) : (
                <ShieldCheck size={16} className="shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || activeAmount < 10 || activeAmount > 100000}
          className="w-full py-3.5 mt-3 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-[#7c3aed]/50 text-white rounded-[12px] font-medium text-[15px] transition-colors active:scale-[0.98]"
        >
          {loading 
            ? "Processing..." 
            : activeAmount >= 10 && activeAmount <= 100000
              ? `Support ₹${activeAmount}` 
              : activeAmount > 0 
                ? "Minimum ₹10" 
                : "Enter Amount"}
        </button>

        {/* Footer info */}
        <div className="mt-3 text-center flex flex-col items-center gap-1">
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
            <Lock size={10} /> Payments are secure and encrypted.
          </p>
          <p className="text-[11px] text-zinc-600">
            Powered by Razorpay.
          </p>
        </div>
      </form>
    </div>
  );
}