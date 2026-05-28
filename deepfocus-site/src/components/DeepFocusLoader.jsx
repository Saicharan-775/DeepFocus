import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export const HANDS_LOADER_SRC = "https://lottie.host/5a449ee2-c5f8-439b-9455-6e83cde25682/XXzIGAxwx3.lottie";

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
    <div
      className={`${shellClass} flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className={sizeClass}>
        <DotLottieReact src={HANDS_LOADER_SRC} loop autoplay />
      </div>
      {message && (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
          {message}
        </p>
      )}
    </div>
  );
}
