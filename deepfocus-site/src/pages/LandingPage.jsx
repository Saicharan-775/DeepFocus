import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import DeepFocusLoader from "../components/DeepFocusLoader";

const CreativeBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none flex justify-center overflow-hidden bg-[#07070b]">
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#07070b_0%,#090813_28%,#080711_56%,#07070b_100%)]" />
    
    <div className="absolute inset-0 opacity-[0.32]">
      <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.2)_0%,_transparent_70%)]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.16)_0%,_transparent_70%)]" />
      <div className="absolute top-[28%] right-[8%] w-[55vw] h-[55vh] bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.12)_0%,_transparent_68%)]" />
    </div>

    <div className="absolute top-[30%] flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 2.8], opacity: [0.15, 0] }}
          transition={{ duration: 10, repeat: Infinity, delay: i * 3, ease: "easeOut" }}
          className="absolute w-[400px] h-[400px] border border-white/10 rounded-full"
        />
      ))}
    </div>

    <div className="absolute inset-0 opacity-[0.045] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
        backgroundSize: '4rem 4rem',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 10%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 10%, transparent 80%)'
      }}
    />
  </div>
);

const VideoDemo = lazy(() => import("../components/VideoDemo"));
const ProblemSection = lazy(() => import("../components/ProblemSection"));
const Features = lazy(() => import("../components/Features"));
const Timeline = lazy(() => import("../components/Timeline"));
const FinalCTA = lazy(() => import("../components/FinalCTA"));

export default function LandingPage() {

  return (
    <div className="bg-[#07070b] text-white min-h-screen relative overflow-x-hidden">
      <CreativeBackground />
      <Navbar />
      <Hero />
      <Suspense fallback={<DeepFocusLoader message="Loading page sections..." fullScreen={false} size="md" />}>
        <VideoDemo />
        <ProblemSection />
        <Features />
        <Timeline />
        <FinalCTA />

      </Suspense>

    </div>
  );
}
