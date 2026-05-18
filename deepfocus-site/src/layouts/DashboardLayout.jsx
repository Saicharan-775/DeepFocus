import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import OnboardingTour from '../components/dashboard/OnboardingTour';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-[#000000] text-gray-200 overflow-hidden font-sans">
      <OnboardingTour />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Main content container with proper spacing */}
          <div className="p-8 pb-24 max-w-[1400px] mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
