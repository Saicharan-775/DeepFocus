import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Zap, Heart, Sliders, Check } from "lucide-react";

export const PRESETS = [
  { id: "coffee", Icon: Coffee, amount: 99, label: "COFFEE" },
  { id: "boost", Icon: Zap, amount: 299, label: "BOOST" },
  { id: "founder", Icon: Heart, amount: 499, label: "FOUNDER" },
  { id: "custom", Icon: Sliders, amount: 0, label: "CUSTOM" },
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
  handleDonate,
  activeAmount,
}) {
  
  // Handler to enforce the 1 Lakh (100,000) limit
  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setCustomAmount('');
      return;
    }
    
    const num = parseInt(val, 10);
    // Cap the amount at 1,00,000
    if (num > 100000) {
      setCustomAmount('100000');
    } else {
      setCustomAmount(num.toString());
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-[#0E0E10] border border-zinc-800 rounded-[24px] p-6 shadow-2xl">
      {/* Header */}
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        Support the project <span className="text-rose-500">❤️</span>
      </h2>

      {/* Two-Column Grid for Presets */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedPreset(preset.id)}
              className={`flex items-center justify-between px-4 py-4 rounded-[16px] border transition-all duration-200 ${
                isSelected
                  ? "bg-transparent border-[#7c3aed] text-white"
                  : "bg-[#141416] border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <preset.Icon size={16} className={isSelected ? "text-white" : "text-zinc-500"} />
                <span className="text-[13px] font-bold tracking-wide">{preset.label}</span>
              </div>
              <span className="text-[13px] font-medium">{preset.amount > 0 ? `₹${preset.amount}` : "..."}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleDonate} className="flex flex-col gap-4">
        {/* Custom Amount Reveal */}
        <AnimatePresence>
          {selectedPreset === "custom" && (
            <motion.input
              initial={{ opacity: 0, y: -10, height: 0 }} 
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              type="number"
              max="100000"
              placeholder="Enter amount (Max ₹1,00,000)"
              value={customAmount}
              onChange={handleCustomAmountChange}
              className="w-full px-4 py-3 bg-[#141416] border border-zinc-800 rounded-[12px] text-sm text-white focus:outline-none focus:border-[#7c3aed]"
            />
          )}
        </AnimatePresence>

        {/* Labeled Inputs */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Name or Twitter</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name or @twitter (optional)"
            className="w-full px-4 py-3 bg-[#141416] border border-zinc-800 rounded-[12px] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com (optional)"
            className="w-full px-4 py-3 bg-[#141416] border border-zinc-800 rounded-[12px] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Backer Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 150))}
            placeholder="Say something nice... (optional)"
            rows={4}
            className="w-full px-4 py-3 bg-[#141416] border border-zinc-800 rounded-[12px] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
          />
          <span className="text-[10px] text-zinc-600 self-end">{message.length}/150</span>
        </div>

        {/* Custom Checkbox for Privacy */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={() => setAnonymous(!anonymous)}
        >
          <div className={`w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center transition-all duration-200 ${
            anonymous 
              ? "bg-[#7c3aed] border-[#7c3aed]" 
              : "bg-transparent border-zinc-700 group-hover:border-zinc-500"
          }`}>
            {anonymous && <Check size={12} strokeWidth={3} className="text-white" />}
          </div>
          <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Make this private</span>
        </div>

        <button
          type="submit"
          className="w-full py-4 mt-2 bg-[#7c3aed] text-white rounded-[12px] font-semibold text-sm hover:bg-[#6d28d9] transition-all"
        >
          Support ₹{activeAmount || "0"}
        </button>
      </form>
    </div>
  );
}