
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CalendarProvider } from '@/contexts/CalendarContext';
import Index from '@/pages/Index';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import NewFarmPage from '@/pages/NewFarmPage';
import FarmProfilePage from '@/pages/FarmProfilePage';
import SubsidySearchPage from '@/pages/SubsidySearchPage';
import CalendarPage from '@/pages/CalendarPage';
import ApplicationFormPage from '@/pages/ApplicationFormPage';
import EUSubsidyPortalPage from '@/pages/EUSubsidyPortalPage';
import RegulationsPage from '@/pages/RegulationsPage';
import AdminPage from '@/pages/AdminPage';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import FarmEditPage from '@/pages/FarmEditPage';
import ErrorBoundary from '@/components/ErrorBoundary';
import GenericErrorFallback from '@/components/error/GenericErrorFallback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

function App() {
  console.log('App: Rendering');
  
  return (
    <ErrorBoundary 
      fallback={({ error, resetError }) => (
        <GenericErrorFallback 
          error={error} 
          resetError={resetError}
          customMessage="A critical error occurred in the application. Please refresh the page or contact support."
        />
      )}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <CalendarProvider>
              <div className="min-h-screen bg-background font-sans antialiased">
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
                    path="/farm/new" 
                    element={
                      <ProtectedRoute>
                        <NewFarmPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farm/:farmId" 
                    element={
                      <ProtectedRoute>
                        <FarmProfilePage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farm/:farmId/edit" 
                    element={
                      <ProtectedRoute>
                        <FarmEditPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/search" 
                    element={
                      <ProtectedRoute>
                        <SubsidySearchPage />
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
                    path="/admin" 
                    element={
                      <ProtectedRoute>
                        <AdminPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
              </div>
            </CalendarProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
