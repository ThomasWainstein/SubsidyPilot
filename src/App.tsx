import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/language";
import DemoDisclaimer from "./components/DemoDisclaimer";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import FarmProfilePage from "./pages/FarmProfilePage";
import ApplicationFormPage from "./pages/ApplicationFormPage";
import EUSubsidyPortalPage from "./pages/EUSubsidyPortalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/farm/:id" element={<FarmProfilePage />} />
            <Route path="/farm/:farmId/apply/:subsidyId" element={<ApplicationFormPage />} />
            <Route path="/eu-subsidy-portal" element={<EUSubsidyPortalPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <DemoDisclaimer />
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
