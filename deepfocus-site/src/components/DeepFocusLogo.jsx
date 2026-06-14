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
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-black shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${markClassName}`}
      >
        <img
          src="/deepfocus-logo-small.png"
          alt="DeepFocus"
          className="h-full w-full object-contain p-1"
          width="36"
          height="36"
          loading="eager"
          decoding="async"
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
