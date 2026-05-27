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
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="scrollbar-hide min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {/* Main content container with proper spacing */}
          <div className="mx-auto min-h-full w-full max-w-[1600px] p-4 pb-24 md:p-6 md:pb-24 xl:p-8 xl:pb-24">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
