
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/language";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CalendarProvider } from "@/contexts/CalendarContext";

import Index from "./pages/Index";
import DashboardPage from "./pages/DashboardPage";
import SubsidySearchPage from "./pages/SubsidySearchPage";
import FarmProfilePage from "./pages/FarmProfilePage";
import CalendarPage from "./pages/CalendarPage";
import ApplicationFormPage from "./pages/ApplicationFormPage";
import EUSubsidyPortalPage from "./pages/EUSubsidyPortalPage";
import RegulationsPage from "./pages/RegulationsPage";
import NewFarmPage from "./pages/NewFarmPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <CalendarProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subsidies"
                  element={
                    <ProtectedRoute>
                      <SubsidySearchPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farm/:id"
                  element={
                    <ProtectedRoute>
                      <FarmProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/application/:subsidyId"
                  element={
                    <ProtectedRoute>
                      <ApplicationFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/eu-portal"
                  element={
                    <ProtectedRoute>
                      <EUSubsidyPortalPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/regulations"
                  element={
                    <ProtectedRoute>
                      <RegulationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/new-farm"
                  element={
                    <ProtectedRoute>
                      <NewFarmPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </CalendarProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
