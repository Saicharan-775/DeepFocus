import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";
import MainLayout from "./layouts/MainLayout";
import LandingPage from "./pages/LandingPage";
import DeepFocusLoader from "./components/DeepFocusLoader";

const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AiPlanner = lazy(() => import("./pages/AiPlanner"));
const Revision = lazy(() => import("./pages/Revision.jsx"));
const Sheet = lazy(() => import("./pages/Sheet.jsx"));
const TodaysRevision = lazy(() => import("./pages/TodaysRevision.jsx"));
const RevisionWorkspace = lazy(() => import("./pages/RevisionWorkspace.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Guide = lazy(() => import("./pages/Guide"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const AuthPage = lazy(() => import("./components/AuthPage.jsx"));
const AuthCallback = lazy(() => import("./components/AuthCallback.jsx"));
import ProtectedRoute from "./components/ProtectedRoute";
import { startExtensionSync } from "./services/extensionSync";

function App() {

  useEffect(() => {
    startExtensionSync();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<DeepFocusLoader message="Loading DeepFocus..." />}>
          <Routes>

            {/* Marketing pages */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="guide" element={<Guide />} />
            </Route>

            {/* Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/revision" element={<Revision />} />
                <Route path="/workspace" element={<RevisionWorkspace />} />
                <Route path="/sheet" element={<Sheet />} />
                <Route path="/today" element={<TodaysRevision />} />
                <Route path="/planner" element={<AiPlanner />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/library" element={<Library />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            {/* Auth routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
      <SpeedInsights />
    </ErrorBoundary>
  );
}

export default App;
