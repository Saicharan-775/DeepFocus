import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import MainLayout from "./layouts/MainLayout";

import LandingPage from "./pages/LandingPage";
import Revision from "./pages/Revision.jsx";
import TodaysRevision from "./pages/TodaysRevision.jsx";
import Guide from "./pages/Guide";
import Insights from "./pages/Insights.jsx";
import Library from "./pages/Library.jsx";
import { startExtensionSync } from "./services/extensionSync";

function App() {

  useEffect(() => {
    startExtensionSync();
  }, []);

  return (
    <Router>
      <Routes>

        {/* Marketing pages */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="guide" element={<Guide />} />
        </Route>

        {/* Dashboard page */}
        <Route path="/revision" element={<Revision />} />
        <Route path="/today" element={<TodaysRevision />} />
        <Route path="/library" element={<Library />} />
        <Route path="/insights" element={<Insights />} />
      </Routes>
    </Router>
  );
}

export default App;