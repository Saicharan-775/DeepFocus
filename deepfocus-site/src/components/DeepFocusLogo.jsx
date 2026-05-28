import React from "react";

export default function DeepFocusLogo({
  showText = true,
  markClassName = "",
  textClassName = "",
  className = "",
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        className={`relative flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-black shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${markClassName}`}
      >
        <img
          src="/deepfocus-logo.png"
          alt="DeepFocus"
          className="h-full w-full object-contain scale-[1.08]"
          draggable="false"
        />
      </span>
      {showText && (
        <span className={`font-bold tracking-tight text-white ${textClassName}`}>
          DeepFocus
        </span>
      )}
    </span>
  );
}
