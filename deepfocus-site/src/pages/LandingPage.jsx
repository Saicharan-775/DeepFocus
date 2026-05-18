import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

import { lazy, Suspense } from "react";
import { motion } from "framer-motion";

const CreativeBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none flex justify-center overflow-hidden bg-[#030305]">
    
    {/* Modern Mesh Gradient - Very Subtle */}
    <div className="absolute inset-0 opacity-[0.15]">
      <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.1)_0%,_transparent_70%)]" />
    </div>

    {/* Animated Focus Rings - Ultra-Thin & Premium (Not Glowing) */}
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

    {/* Noise Texture for Premium Grain */}
    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

    {/* Engineering Grid - Elegant Scale */}
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
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
const Footer = lazy(() => import("../components/Footer"));

export default function LandingPage() {

  return (
    <div className="bg-[#030305] text-white min-h-screen relative overflow-x-hidden">
      <CreativeBackground />
      <Navbar />
      <Hero />
      <Suspense fallback={<div className="h-32 flex items-center justify-center text-gray-500">Loading...</div>}>
        <VideoDemo />
        <ProblemSection />
        <Features />
        <Timeline />
        <FinalCTA />

      </Suspense>

    </div>
  );
}