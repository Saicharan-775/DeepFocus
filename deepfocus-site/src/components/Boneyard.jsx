import React from "react";

// Base skeleton pulse block
export function Bone({ className = "", variant = "rect" }) {
  const baseClass = "animate-pulse bg-white/[0.035] rounded-lg border border-white/[0.015]";
  const variantClass = 
    variant === "circle" 
      ? "rounded-full" 
      : variant === "text" 
      ? "h-3.5 w-3/4 rounded" 
      : "";
  return <div className={`${baseClass} ${variantClass} ${className}`} />;
}

// Stats Card skeleton (TODAY, MASTERED, etc.)
export function StatCardSkeleton() {
  return (
    <div className="min-h-[82px] rounded-xl border border-white/[0.065] bg-[#0D0C10] p-3.5 flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <Bone className="h-3 w-3 rounded-full" />
        <Bone className="h-2.5 w-16" />
      </div>
      <Bone className="h-6 w-12 mt-2" />
    </div>
  );
}

// Personalised Revision Strategy card skeleton
export function RevisionCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.05] bg-[#0D0C10]/40 flex flex-col justify-between h-full min-h-[160px]">
      <div className="w-full">
        {/* Category Tag */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Bone className="h-1.5 w-1.5 rounded-full" />
          <Bone className="h-2 w-20" />
        </div>
        {/* Title */}
        <Bone className="h-4 w-32 mb-2" />
        {/* Description */}
        <div className="space-y-1.5">
          <Bone className="h-2.5 w-full" />
          <Bone className="h-2.5 w-5/6" />
        </div>
      </div>
      {/* Button */}
      <Bone className="h-8 w-full mt-5 rounded-lg" />
    </div>
  );
}

// Curriculum Sheet Card skeleton
export function SheetCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0d12]/80 p-7 h-full flex items-center justify-between gap-6">
      <div className="flex-1 min-w-0 space-y-2.5">
        <Bone className="h-4 w-28" />
        <Bone className="h-3.5 w-16" />
        <Bone className="h-5 w-20 rounded-full mt-2" />
      </div>
      <div className="relative flex items-center justify-center shrink-0">
        <Bone className="h-16 w-16 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Dashboard Screen Skeleton ─── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Row 1: Header Skeleton */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Bone className="h-3 w-16 mb-2" />
          <Bone className="h-7 w-48" />
        </div>
        <Bone className="h-11 w-44 rounded-lg self-start md:self-auto" />
      </div>

      {/* Row 2: 6 Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Row 3: Revision Strategy + Quality Distribution */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 border border-white/[0.08] bg-[#0D0C10]/98 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-4">
            <Bone className="h-3.5 w-3.5 rounded-full" />
            <Bone className="h-3 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <RevisionCardSkeleton key={i} />
            ))}
          </div>
        </div>

        <div className="border border-white/[0.08] bg-[#0D0C10]/98 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-4">
            <Bone className="h-3.5 w-3.5 rounded-full" />
            <Bone className="h-3 w-20" />
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <Bone className="h-24 w-24 rounded-full" />
            <div className="grid grid-cols-3 gap-2 w-full mt-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border border-white/[0.055] bg-white/[0.02] p-2 flex flex-col items-center gap-1.5">
                  <Bone className="h-1.5 w-8" />
                  <Bone className="h-3.5 w-5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Weak patterns + Pressure Map */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
        <div className="border border-white/[0.08] bg-[#0D0C10]/98 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-4">
            <Bone className="h-3.5 w-3.5 rounded-full" />
            <Bone className="h-3 w-32" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Bone className="h-3.5 w-20" />
              <Bone className="h-2 flex-1 rounded-full" />
              <Bone className="h-3.5 w-12" />
            </div>
          ))}
        </div>

        <div className="border border-white/[0.08] bg-[#0D0C10]/98 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-4">
            <Bone className="h-3 w-28" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <Bone className="h-4 w-4 rounded" />
                <Bone className="h-3 w-36" />
              </div>
              <Bone className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Curriculum Sheet Skeleton ─── */
export function SheetSkeleton() {
  return (
    <div className="relative max-w-[1040px] mx-auto px-6 pt-12 md:pt-16 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="mb-12 border-b border-white/[0.04] pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Bone className="h-3 w-16 mb-2" />
          <Bone className="h-8 w-60" />
          <Bone className="h-3 w-96 mt-2" />
        </div>
        <div className="flex items-center gap-6 shrink-0 font-mono text-sm">
          <div className="px-5 py-3.5 rounded-xl bg-[#0c0d12]/80 border border-white/[0.06] w-36 space-y-1.5">
            <Bone className="h-2 w-12" />
            <Bone className="h-3.5 w-24" />
          </div>
          <div className="px-5 py-3.5 rounded-xl bg-[#0c0d12]/80 border border-white/[0.06] w-36 space-y-1.5">
            <Bone className="h-2 w-16" />
            <Bone className="h-3.5 w-20" />
          </div>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5 mb-10">
        <Bone className="h-10 w-full sm:max-w-sm rounded-xl" />
        <Bone className="h-10 w-44 rounded-xl" />
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(12)].map((_, i) => (
          <SheetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Analytics Screen Skeleton ─── */
export function AnalyticsSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 text-zinc-100 pb-20 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 border border-white/5 bg-[#09090b]/80 rounded-2xl flex flex-col items-center space-y-4">
            <Bone className="h-20 w-20 rounded-full" />
            <Bone className="h-4.5 w-32" />
            <Bone className="h-3 w-20" />
            <div className="w-full border-t border-white/[0.04] pt-4 flex justify-around">
              <div className="text-center space-y-1">
                <Bone className="h-3 w-10 mx-auto" />
                <Bone className="h-2 w-12" />
              </div>
              <div className="text-center space-y-1">
                <Bone className="h-3 w-8 mx-auto" />
                <Bone className="h-2 w-16" />
              </div>
            </div>
            <div className="w-full pt-4 flex flex-col items-center space-y-3">
              <Bone className="h-24 w-24 rounded-full" />
              <div className="w-full space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <Bone className="h-2.5 w-16" />
                    <Bone className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="border border-white/5 bg-[#09090b]/80 rounded-2xl p-6 space-y-4">
            <Bone className="h-3.5 w-36" />
            <Bone className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-white/5 bg-[#09090b]/80 rounded-2xl p-6 space-y-4">
              <Bone className="h-3.5 w-28" />
              <Bone className="h-24 w-full" />
            </div>
            <div className="border border-white/5 bg-[#09090b]/80 rounded-2xl p-6 space-y-4">
              <Bone className="h-3.5 w-32" />
              <Bone className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Revision List / Library Skeleton ─── */
export function LibrarySkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <Bone className="h-5 w-48 mb-2" />
          <Bone className="h-3 w-80" />
        </div>
        <Bone className="h-10 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-white/[0.06] bg-[#0c0d12]/60 rounded-xl p-5 space-y-3.5">
            <div className="flex justify-between items-start">
              <Bone className="h-4.5 w-36" />
              <Bone className="h-3 w-12" />
            </div>
            <Bone className="h-3 w-20" />
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
              <Bone className="h-2.5 w-16" />
              <Bone className="h-6 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevisionSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center border-b border-white/[0.04] pb-6">
        <div>
          <Bone className="h-3 w-12 mb-2" />
          <Bone className="h-6 w-36" />
        </div>
        <Bone className="h-10 w-28 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-white/[0.06] bg-[#0c0d12]/40 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Bone className="h-4.5 w-48" />
                <Bone className="h-4 w-12 rounded-full" />
              </div>
              <Bone className="h-3 w-72" />
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Bone className="h-8 w-24 rounded-lg" />
              <Bone className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Workspace Screen Skeleton ─── */
export function WorkspaceSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Left pane: Code Editor placeholder */}
      <div className="lg:col-span-7 border border-white/[0.08] bg-[#0D0C10] rounded-xl flex flex-col overflow-hidden h-full">
        {/* Editor tabs */}
        <div className="border-b border-white/[0.04] bg-white/[0.005] px-4 py-2.5 flex items-center justify-between">
          <div className="flex gap-2">
            <Bone className="h-5 w-20 rounded" />
            <Bone className="h-5 w-24 rounded" />
          </div>
          <Bone className="h-6 w-16 rounded-md" />
        </div>
        {/* Editor Content */}
        <div className="p-5 flex-1 font-mono text-xs text-zinc-600 space-y-3 overflow-hidden select-none">
          <div className="flex gap-4">
            <div className="w-6 text-right space-y-1 opacity-40">
              {[...Array(15)].map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <div className="flex-1 space-y-2.5 pt-0.5">
              <Bone className="h-3 w-1/4 bg-violet-400/10" />
              <Bone className="h-3 w-2/3 bg-zinc-400/5" />
              <Bone className="h-3 w-1/2 bg-zinc-400/5" />
              <Bone className="h-3 w-3/4 bg-violet-400/10" />
              <Bone className="h-3 w-1/3 bg-zinc-400/5" />
              <Bone className="h-3 w-2/3 bg-zinc-400/5" />
              <Bone className="h-3 w-1/2 bg-violet-400/10" />
              <Bone className="h-3 w-5/6 bg-zinc-400/5" />
              <Bone className="h-3 w-1/4 bg-zinc-400/5" />
            </div>
          </div>
        </div>
      </div>

      {/* Right pane: Side widgets / Chat */}
      <div className="lg:col-span-5 flex flex-col gap-5 h-full">
        <div className="border border-white/[0.08] bg-[#0D0C10] rounded-xl p-5 flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/[0.04] pb-4">
            <Bone className="h-4 w-4 rounded-full" />
            <Bone className="h-3.5 w-32" />
          </div>
          <div className="flex-1 py-4 space-y-4 overflow-hidden">
            <div className="flex gap-3 items-start">
              <Bone className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3 w-20" />
                <Bone className="h-10 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex gap-3 items-start justify-end">
              <div className="flex-1 space-y-1.5 flex flex-col items-end">
                <Bone className="h-3 w-16" />
                <Bone className="h-8 w-3/4 rounded-lg" />
              </div>
              <Bone className="h-6 w-6 rounded-full" />
            </div>
          </div>
          <Bone className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Community Screen Skeleton ─── */
export function CommunitySkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Bone className="h-6 w-48 mb-2" />
          <Bone className="h-3.5 w-72" />
        </div>
        <Bone className="h-10 w-36 rounded-lg" />
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[...Array(6)].map((_, i) => (
          <Bone key={i} className="h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>

      <div className="border border-white/[0.08] bg-[#0D0C10]/98 rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        <div className="p-4 flex items-center justify-between bg-white/[0.005]">
          <Bone className="h-9 w-60 rounded-xl" />
          <Bone className="h-9 w-28 rounded-xl" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Bone className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1 min-w-0">
                <Bone className="h-4.5 w-3/4" />
                <div className="flex items-center gap-2">
                  <Bone className="h-3 w-16" />
                  <Bone className="h-3 w-3 rounded-full" />
                  <Bone className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <div className="flex items-center gap-1.5">
                <Bone className="h-3.5 w-8" />
              </div>
              <Bone className="h-8 w-11 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Community Post Detail Skeleton ─── */
export function CommunityPostSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[920px] space-y-6 animate-fade-in">
      <Bone className="h-8 w-24 rounded-lg" />

      <div className="border border-white/[0.08] bg-[#0D0C10]/98 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-20" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Bone className="h-6 w-3/4" />
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-4/5" />
        </div>

        <div className="flex gap-2 pt-2">
          <Bone className="h-6 w-16 rounded-full" />
          <Bone className="h-6 w-20 rounded-full" />
        </div>

        <div className="border-t border-white/[0.04] pt-4 flex items-center justify-between">
          <div className="flex gap-4">
            <Bone className="h-8 w-16 rounded-lg" />
            <Bone className="h-8 w-16 rounded-lg" />
          </div>
          <Bone className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="space-y-4">
        <Bone className="h-4.5 w-20" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-white/[0.06] bg-[#0c0d12]/40 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Bone className="h-6 w-6 rounded-full" />
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-16" />
            </div>
            <Bone className="h-3.5 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feedback Screen Skeleton ─── */
export function FeedbackSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <Bone className="h-7 w-48 mx-auto" />
        <Bone className="h-4 w-96 mx-auto" />
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6 md:p-8 space-y-6">
        {/* Category Tabs */}
        <div className="space-y-2">
          <Bone className="h-3 w-24" />
          <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
            {[...Array(4)].map((_, i) => (
              <Bone key={i} className="h-8 flex-1 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <Bone className="h-3 w-28" />
          <div className="flex gap-1.5 py-1">
            {[...Array(5)].map((_, i) => (
              <Bone key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-10 w-full rounded-xl" />
        </div>

        {/* Details */}
        <div className="space-y-2">
          <Bone className="h-3 w-16" />
          <Bone className="h-32 w-full rounded-xl" />
        </div>

        {/* Optional Email */}
        <div className="space-y-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-10 w-full rounded-xl" />
        </div>

        {/* File Dropzone */}
        <div className="space-y-2">
          <Bone className="h-3 w-36" />
          <Bone className="h-24 w-full rounded-xl" />
        </div>

        {/* Button */}
        <div className="flex justify-end">
          <Bone className="h-10 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ─── Settings Screen Skeleton ─── */
export function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl py-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
        <div>
          <Bone className="h-6 w-32 mb-1.5" />
          <Bone className="h-3.5 w-60" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Bone key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="md:col-span-3 border border-white/5 bg-zinc-950/40 rounded-xl p-6 space-y-6">
          <Bone className="h-5 w-40" />
          <Bone className="h-10 w-full rounded-xl" />
          <Bone className="h-24 w-full rounded-xl" />
          <div className="flex justify-end">
            <Bone className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── App Layout Shell Skeleton (Suspense / Callback) ─── */
export function AppLayoutSkeleton() {
  return (
    <div className="flex h-screen bg-[#000000] text-gray-200 overflow-hidden font-sans">
      {/* Sidebar Placeholder */}
      <div className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#09090b] flex-col p-6 space-y-8 md:flex">
        <Bone className="h-8 w-32 rounded-lg animate-pulse" />
        <div className="space-y-4 flex-1 pt-4">
          {[...Array(6)].map((_, i) => (
            <Bone key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* Main Panel Placeholder */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header Placeholder */}
        <div className="h-14 shrink-0 border-b border-white/[0.06] bg-[#09090b] px-6 flex items-center justify-between">
          <Bone className="h-6 w-36" />
          <Bone className="h-8 w-8 rounded-full" />
        </div>
        {/* Content Skeleton */}
        <div className="mx-auto min-h-full w-full max-w-[1600px] p-6 space-y-6 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Bone className="h-3 w-12" />
              <Bone className="h-6 w-48" />
            </div>
            <Bone className="h-10 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Bone key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
          <Bone className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

