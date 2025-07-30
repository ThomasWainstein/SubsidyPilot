
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RoleProvider } from '@/contexts/RoleContext';
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
import SubsidyDetailPage from '@/pages/SubsidyDetailPage';
// import RegulationsPage from '@/pages/RegulationsPage'; // Removed per business requirements
import AdminPage from '@/pages/AdminPage';
import SettingsPage from '@/pages/SettingsPage';
import EmployeeDashboardPage from '@/pages/EmployeeDashboardPage';
import ConsultantDashboardPage from '@/pages/ConsultantDashboardPage';
import OrganizationDashboardPage from '@/pages/OrganizationDashboardPage';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import FarmEditPage from '@/pages/FarmEditPage';
import DocumentReviewPage from '@/pages/DocumentReviewPage';
import DocumentReviewDetailPage from '@/pages/DocumentReviewDetailPage';
import ExtractionAnalyticsPage from '@/pages/ExtractionAnalyticsPage';
import SupportedFileTypesPage from '@/pages/SupportedFileTypesPage';
import ReviewWorkflowDocsPage from '@/pages/ReviewWorkflowDocsPage';
import TrainingPipelinePage from '@/pages/TrainingPipelinePage';
import ErrorBoundary from '@/components/ErrorBoundary';
import GenericErrorFallback from '@/components/error/GenericErrorFallback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
          <RoleProvider>
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
                    path="/farm/:farmId/document-review" 
                    element={
                      <ProtectedRoute>
                        <DocumentReviewPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farm/:farmId/document-review/:documentId" 
                    element={
                      <ProtectedRoute>
                        <DocumentReviewDetailPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/farm/:farmId/document-review/analytics" 
                    element={
                      <ProtectedRoute>
                        <ExtractionAnalyticsPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supported-file-types" 
                    element={
                      <SupportedFileTypesPage />
                    } 
                  />
                  <Route 
                    path="/review-workflow" 
                    element={
                      <ReviewWorkflowDocsPage />
                    } 
                  />
                  <Route 
                    path="/farm/:farmId/training" 
                    element={
                      <ProtectedRoute>
                        <TrainingPipelinePage />
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
                    path="/subsidy/:subsidyId" 
                    element={
                      <ProtectedRoute>
                        <SubsidyDetailPage />
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
                    {/* Regulations route removed per business requirements */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute>
                        <AdminPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/employee-dashboard" 
                    element={
                      <ProtectedRoute>
                        <EmployeeDashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/consultant-dashboard" 
                    element={
                      <ProtectedRoute>
                        <ConsultantDashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organization-dashboard" 
                    element={
                      <ProtectedRoute>
                        <OrganizationDashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                  <Toaster />
                </div>
              </CalendarProvider>
            </LanguageProvider>
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
