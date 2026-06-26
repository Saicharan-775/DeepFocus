import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

import { lazy, Suspense, useEffect } from "react";
import DeepFocusLoader from "../components/DeepFocusLoader";
import { useToast } from "../hooks/useToast";

const CreativeBackground = () => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
    <div
      className="landing-grid-drift absolute inset-0"
      style={{
        background: "#000000",
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(248, 250, 252, 0.16) 1px, transparent 0),
          radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.12) 1px, transparent 0),
          radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.08) 1px, transparent 0)
        `,
        backgroundSize: "20px 20px, 30px 30px, 25px 25px",
        backgroundPosition: "0 0, 10px 10px, 15px 5px",
      }}
    />
    <div className="landing-aurora-field absolute inset-0" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_44%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.42))]" />
  </div>
);

const VideoDemo = lazy(() => import("../components/VideoDemo"));
const ProblemSection = lazy(() => import("../components/ProblemSection"));
const Features = lazy(() => import("../components/Features"));
const Timeline = lazy(() => import("../components/Timeline"));
const FinalCTA = lazy(() => import("../components/FinalCTA"));

export default function LandingPage() {
  const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("deleted") === "success") {
      showToast(
        "Account Deleted",
        "Your account and all associated data have been permanently deleted.",
        "system"
      );
      // Clean up query parameters from the browser history bar
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [showToast]);

  return (
    <div className="landing-typography relative min-h-screen overflow-x-hidden bg-black text-[#F8FAFC]">
      <CreativeBackground />
      <Navbar />
      <Hero />
      <Suspense fallback={<DeepFocusLoader message="" fullScreen={false} size="md" />}>
        <VideoDemo />
        <ProblemSection />
        <Features />
        <Timeline />
        <FinalCTA />

      </Suspense>

    </div>
  );
}
