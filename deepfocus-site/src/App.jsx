import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";
import MainLayout from "./layouts/MainLayout";
import LandingPage from "./pages/LandingPage";
import DeepFocusLoader from "./components/DeepFocusLoader";

import DashboardLayout from "./layouts/DashboardLayout";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AiPlanner = lazy(() => import("./pages/AiPlanner"));
const Revision = lazy(() => import("./pages/Revision.jsx"));
const Sheet = lazy(() => import("./pages/Sheet.jsx"));
const TodaysRevision = lazy(() => import("./pages/TodaysRevision.jsx"));
const RevisionWorkspace = lazy(() => import("./pages/RevisionWorkspace.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Feedback = lazy(() => import("./pages/Feedback.jsx"));
const Guide = lazy(() => import("./pages/Guide"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const Community = lazy(() => import("./pages/Community.jsx"));
const CommunityPost = lazy(() => import("./pages/CommunityPost.jsx"));
const NewCommunityPost = lazy(() => import("./pages/NewCommunityPost.jsx"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const AuthPage = lazy(() => import("./components/AuthPage.jsx"));
const AuthCallback = lazy(() => import("./components/AuthCallback.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.jsx"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy.jsx"));
const DataDeletionPolicy = lazy(() => import("./pages/DataDeletionPolicy.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));
import ProtectedRoute from "./components/ProtectedRoute";
import { startExtensionSync } from "./services/extensionSync";
import {
  DashboardSkeleton,
  SheetSkeleton,
  AnalyticsSkeleton,
  LibrarySkeleton,
  RevisionSkeleton,
  WorkspaceSkeleton,
  CommunitySkeleton,
  CommunityPostSkeleton,
  FeedbackSkeleton,
  SettingsSkeleton
} from "./components/Boneyard";

function App() {

  useEffect(() => {
    startExtensionSync();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<DeepFocusLoader message="" />}>
          <Routes>

            {/* Marketing pages */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="guide" element={<Guide />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="terms" element={<TermsOfService />} />
              <Route path="cookies" element={<CookiePolicy />} />
              <Route path="deletion" element={<DataDeletionPolicy />} />
              <Route path="contact" element={<Contact />} />
            </Route>

            {/* Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense>} />
                <Route path="/revision" element={<Suspense fallback={<RevisionSkeleton />}><Revision /></Suspense>} />
                <Route path="/workspace" element={<Suspense fallback={<WorkspaceSkeleton />}><RevisionWorkspace /></Suspense>} />
                <Route path="/sheet" element={<Suspense fallback={<SheetSkeleton />}><Sheet /></Suspense>} />
                <Route path="/today" element={<Suspense fallback={<RevisionSkeleton />}><TodaysRevision /></Suspense>} />
                <Route path="/planner" element={<Suspense fallback={<RevisionSkeleton />}><AiPlanner /></Suspense>} />
                <Route path="/analytics" element={<Suspense fallback={<AnalyticsSkeleton />}><Analytics /></Suspense>} />
                <Route path="/library" element={<Suspense fallback={<LibrarySkeleton />}><Library /></Suspense>} />
                <Route path="/community" element={<Suspense fallback={<CommunitySkeleton />}><Community /></Suspense>} />
                <Route path="/community/new" element={<Suspense fallback={<CommunityPostSkeleton />}><NewCommunityPost /></Suspense>} />
                <Route path="/community/post/:postId" element={<Suspense fallback={<CommunityPostSkeleton />}><CommunityPost /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={<SettingsSkeleton />}><Settings /></Suspense>} />
                <Route path="/feedback" element={<Suspense fallback={<FeedbackSkeleton />}><Feedback /></Suspense>} />
              </Route>
            </Route>
            {/* Auth routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
      <SpeedInsights />
    </ErrorBoundary>
  );
}

export default App;
