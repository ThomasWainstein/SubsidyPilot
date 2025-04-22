
import { Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/language';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./components/theme-provider";

import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import FarmProfilePage from './pages/FarmProfilePage';
import ApplicationFormPage from './pages/ApplicationFormPage';
import EUSubsidyPortalPage from './pages/EUSubsidyPortalPage';
import NotFound from './pages/NotFound';
import SubsidySearchPage from './pages/SubsidySearchPage';

function App() {
  const location = useLocation();

  return (
    <LanguageProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/farm/:farmId" element={<FarmProfilePage />} />
          <Route path="/farm/:farmId/apply/:subsidyId" element={<ApplicationFormPage />} />
          <Route path="/eu-subsidy-portal/:farmId/:subsidyId" element={<EUSubsidyPortalPage />} />
          <Route path="/subsidy-search" element={<SubsidySearchPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
