import React from "react";

export const HANDS_LOADER_SRC = ""; // placeholder removed

export default function DeepFocusLoader({
  message = "Loading...",
  fullScreen = true,
  className = "",
  size = "lg",
}) {
  const sizeClass = size === "sm" ? "w-20 h-20" : size === "md" ? "w-36 h-36" : "w-56 h-56";
  const hasCustomMinHeight = /\bmin-h-/.test(className);
  const shellClass = fullScreen
    ? "fixed inset-0 z-50 min-h-screen bg-black"
    : `${hasCustomMinHeight ? "" : "min-h-[calc(100vh-8rem)]"} w-full bg-transparent`;

  return (
    <div className={`${shellClass} flex flex-col items-center justify-center text-center ${className}`}>
      <div className={`${sizeClass} flex items-center justify-center`}>
        {/* Simple CSS spinner */}
        <div className="animate-spin rounded-full border-4 border-t-emerald-400 border-b-emerald-200 w-full h-full" />
      </div>
      {message && (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
          {message}
        </p>
      )}
    </div>
  );
}
