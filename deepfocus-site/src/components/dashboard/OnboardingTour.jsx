import React, { useState, useEffect } from 'react';
import * as ReactJoyride from 'react-joyride';
const Joyride = ReactJoyride.default || ReactJoyride.Joyride || ReactJoyride;
const { STATUS } = ReactJoyride;

export default function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run the tour if it hasn't been completed before
    const hasSeenTour = localStorage.getItem('has_seen_tour_v3');
    if (!hasSeenTour) {
      // Delay starting the tour slightly to let the UI load
      const timer = setTimeout(() => {
         setRun(true);
         // Proactively mark as seen IMMEDIATELY on start to prevent repetitive popups if page is refreshed mid-tour
         localStorage.setItem('has_seen_tour_v3', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps = [
    {
      target: '.tour-sidebar-toggle',
      title: 'Workspace Focus Toggle',
      content: 'Collapse the side navigation bar to maximize your screen space and eliminate visual clutter while coding.',
      disableBeacon: true,
    },
    {
      target: '.tour-dashboard',
      title: 'Progress Command Center',
      content: 'Access your revision stats, solved ratios, active sheets, and your daily consistency heatmap here.',
    },
    {
      target: '.tour-today',
      title: 'Spaced Repetition Practice',
      content: 'Stop forgetting what you learn. We bring back solved problems right before your memory decays.',
    },
    {
      target: '.tour-sheet',
      title: 'Curriculum Sheets',
      content: 'Complete structured patterns (like NeetCode/Blind75) with interactive state filters and difficulty metrics.',
    },
    {
      target: '.tour-tutor',
      title: '24/7 AI Coding Mentor',
      content: 'Stuck on a tricky edge case or need a template? Ask our AI Tutor for immediate architectural coding hints.',
    },
    {
      target: '.tour-analytics',
      title: 'Developer Analytics & Trophies',
      content: 'Track your focus ranking, and earn premium metallic 3D achievements to showcase your progress.',
    },
    {
      target: '.tour-settings',
      title: 'Extension & Model Settings',
      content: 'Link your browser extension, paste secure settings, and select your preferred AI models.',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleJoyrideCallback}
      disableScroll={true}
      spotlightPadding={6}
      floaterProps={{
        disableAnimation: true,
      }}
      styles={{
        options: {
          arrowColor: '#09090b',
          backgroundColor: '#09090b',
          overlayColor: 'rgba(0, 0, 0, 0.8)',
          primaryColor: '#a855f7', // violet
          textColor: '#a1a1aa',
          zIndex: 1000,
        },
        tooltip: {
          backgroundColor: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(168, 85, 247, 0.05)',
          padding: '24px',
          textAlign: 'left',
          maxWidth: '320px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '15px',
          letterSpacing: '-0.02em',
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '12px',
          lineHeight: '1.6',
          color: '#a1a1aa',
          padding: '0',
        },
        buttonNext: {
          backgroundColor: '#ffffff',
          color: '#000000',
          fontWeight: '800',
          fontSize: '10px',
          letterSpacing: '0.12em',
          borderRadius: '8px',
          padding: '8px 16px',
          textTransform: 'uppercase',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
        buttonBack: {
          color: '#71717a',
          fontWeight: '800',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginRight: '12px',
          cursor: 'pointer',
        },
        buttonSkip: {
          color: '#a855f7',
          fontWeight: '800',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        },
        spotlight: {
          borderRadius: '12px',
          border: '2px solid rgba(168, 85, 247, 0.3)',
        }
      }}
    />
  );
}
