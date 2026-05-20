import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

const MainLayout = lazy(() => import("./layouts/MainLayout"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AiPlanner = lazy(() => import("./pages/AiPlanner"));
const AiTutor = lazy(() => import("./pages/AiTutor"));
const Revision = lazy(() => import("./pages/Revision.jsx"));
const Sheet = lazy(() => import("./pages/Sheet.jsx"));
const TodaysRevision = lazy(() => import("./pages/TodaysRevision.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Guide = lazy(() => import("./pages/Guide"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const AuthPage = lazy(() => import("./components/AuthPage.jsx"));
import ProtectedRoute from "./components/ProtectedRoute";
import { startExtensionSync } from "./services/extensionSync";

function App() {

  useEffect(() => {
    startExtensionSync();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div></div>}>
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
                <Route path="/sheet" element={<Sheet />} />
                <Route path="/today" element={<TodaysRevision />} />
                <Route path="/planner" element={<AiPlanner />} />
                <Route path="/tutor" element={<AiTutor />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/library" element={<Library />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            {/* Auth routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;