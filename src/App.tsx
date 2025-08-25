import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';
import { LanguageProvider } from '@/contexts/language';
import { RoleProvider } from '@/contexts/RoleContext';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import GenericErrorFallback from '@/components/error/GenericErrorFallback';
import PageLoadingSpinner from '@/components/ui/PageLoadingSpinner';

// 🚀 PERFORMANCE: Lazy load all pages for code splitting
const Index = lazy(() => import('@/pages/Index'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const NewFarmPage = lazy(() => import('@/pages/NewFarmPage'));
const FarmProfilePage = lazy(() => import('@/pages/FarmProfilePage'));
const FarmEditPage = lazy(() => import('@/pages/FarmEditPage'));
// Universal Profile Pages
const NewProfilePage = lazy(() => import('@/pages/NewProfilePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('@/pages/ProfileEditPage'));
// Other Pages
const SubsidySearchPage = lazy(() => import('@/pages/SubsidySearchPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const EUSubsidyPortalPage = lazy(() => import('@/pages/EUSubsidyPortalPage'));
const SubsidyDetailPage = lazy(() => import('@/pages/SubsidyDetailPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const SubsidyDetailAdmin = lazy(() => import('@/pages/admin/SubsidyDetail'));
const TestVerbatimPage = lazy(() => import('@/pages/TestVerbatimPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const DocumentReviewPage = lazy(() => import('@/pages/DocumentReviewPage'));
const DocumentReviewDetailPage = lazy(() => import('@/pages/DocumentReviewDetailPage'));
const ExtractionAnalyticsPage = lazy(() => import('@/pages/ExtractionAnalyticsPage'));
const CloudRunTestPage = lazy(() => import('@/pages/CloudRunTestPage'));
const EnhancedExtractionTest = lazy(() => import('@/pages/EnhancedExtractionTest'));
const SupportedFileTypesPage = lazy(() => import('@/pages/SupportedFileTypesPage'));
const ReviewWorkflowDocsPage = lazy(() => import('@/pages/ReviewWorkflowDocsPage'));
const TrainingPipelinePage = lazy(() => import('@/pages/TrainingPipelinePage'));
const FrenchSubsidiesPage = lazy(() => import('@/pages/FrenchSubsidiesPage'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const EmployeeDashboardPage = lazy(() => import('@/pages/EmployeeDashboardPage'));
const ConsultantDashboardPage = lazy(() => import('@/pages/ConsultantDashboardPage'));
const OrganizationDashboardPage = lazy(() => import('@/pages/OrganizationDashboardPage'));
const ScrapeRunsList = lazy(() => import('@/components/admin/ScrapeRunsList'));
const ScrapeReportDashboard = lazy(() => import('@/components/admin/ScrapeReportDashboard'));
const OCRTestDashboard = lazy(() => import('@/components/admin/OCRTestDashboard'));
const ProofOfConcept = lazy(() => import('@/pages/admin/ProofOfConcept'));
const ValidationPage = lazy(() => import('@/pages/ValidationPage'));
const SecurityMonitor = lazy(() => import('@/components/security/SecurityMonitor'));
const BatchParserTest = lazy(() => import('@/pages/admin/BatchParserTest'));
const ClientTypePage = lazy(() => import('@/pages/ClientTypePage'));
const ApplicationFormPage = lazy(() => import('@/pages/ApplicationFormPage'));
const RomanianScrapingTest = lazy(() => import('@/pages/RomanianScrapingTest'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// 🚀 PERFORMANCE: Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in v5)
      refetchOnWindowFocus: false, // Reduce unnecessary network calls
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// 🚀 PERFORMANCE: Memoized protected route wrapper
const ProtectedRouteWrapper = React.memo(({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
));

// 🚀 PERFORMANCE: Loading component for Suspense
const SuspenseWrapper = React.memo(({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoadingSpinner />}>
    {children}
  </Suspense>
));

// Security monitoring wrapper component
const SecurityWrapper = React.memo(({ children }: { children: React.ReactNode }) => {
  useSecurityMonitoring();
  
  // 🚀 PERFORMANCE: Preload critical chunks when idle
  React.useEffect(() => {
    import('@/utils/dynamicImports').then(({ preloadCriticalChunks }) => {
      preloadCriticalChunks();
    });
  }, []);
  
  return <>{children}</>;
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
          <AdminProvider>
            <RoleProvider>
              <LanguageProvider>
                <CalendarProvider>
                  <SecurityWrapper>
                <div className="min-h-screen bg-background font-sans antialiased">
                  <SuspenseWrapper>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<AuthPage />} />
                      
                      {/* 🚀 PERFORMANCE: Grouped protected routes */}
                       <Route path="/dashboard" element={
                         <ProtectedRouteWrapper><DashboardPage /></ProtectedRouteWrapper>
                       } />
                       
                       {/* Universal Profile Routes */}
                       <Route path="/profile/new" element={
                         <ProtectedRouteWrapper><NewProfilePage /></ProtectedRouteWrapper>
                       } />
                       <Route path="/profile/:profileId" element={
                         <ProtectedRouteWrapper><ProfilePage /></ProtectedRouteWrapper>
                       } />
                       <Route path="/profile/:profileId/edit" element={
                         <ProtectedRouteWrapper><ProfileEditPage /></ProtectedRouteWrapper>
                       } />

                       {/* Legacy Farm Routes (Backward Compatibility) */}
                       <Route path="/farm/new" element={
                         <ProtectedRouteWrapper><NewFarmPage /></ProtectedRouteWrapper>
                       } />
                       <Route path="/farm/:farmId" element={
                         <ProtectedRouteWrapper><FarmProfilePage /></ProtectedRouteWrapper>
                       } />
                      
                      <Route path="/farm/:farmId/edit" element={
                        <ProtectedRouteWrapper><FarmEditPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/farm/:farmId/document-review" element={
                        <ProtectedRouteWrapper><DocumentReviewPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/farm/:farmId/document-review/:documentId" element={
                        <ProtectedRouteWrapper><DocumentReviewDetailPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/farm/:farmId/document-review/analytics" element={
                        <ProtectedRouteWrapper><ExtractionAnalyticsPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/cloud-run-test" element={
                        <ProtectedRouteWrapper><CloudRunTestPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/enhanced-extraction" element={
                        <ProtectedRouteWrapper><EnhancedExtractionTest /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/romanian-scraping-test" element={
                        <ProtectedRouteWrapper><RomanianScrapingTest /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/farm/:farmId/training" element={
                        <ProtectedRouteWrapper><TrainingPipelinePage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/search" element={
                        <ProtectedRouteWrapper><SubsidySearchPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/subsidy/:subsidyId" element={
                        <ProtectedRouteWrapper><SubsidyDetailPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/calendar" element={
                        <ProtectedRouteWrapper><CalendarPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/application/:subsidyId" element={
                        <ProtectedRouteWrapper><ApplicationFormPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/eu-portal" element={
                        <ProtectedRouteWrapper><EUSubsidyPortalPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/validation" element={
                        <ProtectedRouteWrapper><ValidationPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/admin" element={
                        <ProtectedRouteWrapper><AdminPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/admin/api-sync" element={
                        <ProtectedRouteWrapper><AdminDashboard /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/admin/subsidy/:id" element={
                        <ProtectedRouteWrapper><SubsidyDetailAdmin /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/admin/proof-of-concept" element={
                        <ProtectedRouteWrapper><ProofOfConcept /></ProtectedRouteWrapper>
                      } />
                      
                       <Route path="/admin/security" element={
                         <ProtectedRouteWrapper><SecurityMonitor /></ProtectedRouteWrapper>
                       } />
                       
                       <Route path="/admin/batch-parser" element={
                         <ProtectedRouteWrapper><BatchParserTest /></ProtectedRouteWrapper>
                       } />
                      
                      <Route path="/client-types" element={
                        <ProtectedRouteWrapper><ClientTypePage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/application/form" element={
                        <ProtectedRouteWrapper><ApplicationFormPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/data-quality" element={
                        <ProtectedRouteWrapper><EmployeeDashboardPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/settings" element={
                        <ProtectedRouteWrapper><SettingsPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/employee-dashboard" element={
                        <ProtectedRouteWrapper><EmployeeDashboardPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/consultant-dashboard" element={
                        <ProtectedRouteWrapper><ConsultantDashboardPage /></ProtectedRouteWrapper>
                      } />
                      
                      <Route path="/organization-dashboard" element={
                        <ProtectedRouteWrapper><OrganizationDashboardPage /></ProtectedRouteWrapper>
                      } />

                      {/* 🚀 PERFORMANCE: Public routes - no protection needed */}
                      <Route path="/french-subsidies" element={<FrenchSubsidiesPage />} />
                      <Route path="/supported-file-types" element={<SupportedFileTypesPage />} />
                      <Route path="/review-workflow" element={<ReviewWorkflowDocsPage />} />
                      <Route path="/test-verbatim" element={<TestVerbatimPage />} />
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SuspenseWrapper>
                    <Toaster />
                    <Sonner />
                  </div>
                  </SecurityWrapper>
                </CalendarProvider>
              </LanguageProvider>
            </RoleProvider>
          </AdminProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default React.memo(App);