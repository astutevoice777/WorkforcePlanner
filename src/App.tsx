import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StaffProtectedRoute } from "@/components/StaffProtectedRoute";
import Index from "./pages/Index";
import BusinessSetup from "./pages/BusinessSetup";
import BusinessSettings from "./pages/BusinessSettings";
import StaffManagement from "./pages/StaffManagement";
import SchedulingDashboard from "./pages/SchedulingDashboard";
import EnhancedSchedulingDashboard from "./pages/EnhancedSchedulingDashboard";
import PayrollDashboard from "./pages/PayrollDashboard";
import StaffPortal from "./pages/StaffPortal";
import StaffTimeOff from "./pages/StaffTimeOff";
import StaffProfile from "./pages/StaffProfile";
import TimeOff from "./pages/TimeOff";
import Auth from "./pages/Auth";
import StaffAuth from "./pages/StaffAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/staff-auth" element={<StaffAuth />} />
          
          {/* Business Owner Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/business-setup" element={
            <ProtectedRoute>
              <BusinessSetup />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <BusinessSettings />
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/schedule" element={
            <ProtectedRoute>
              <SchedulingDashboard />
            </ProtectedRoute>
          } />
          <Route path="/schedule/enhanced" element={
            <ProtectedRoute>
              <EnhancedSchedulingDashboard />
            </ProtectedRoute>
          } />
          <Route path="/time-off" element={
            <ProtectedRoute>
              <TimeOff />
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute>
              <PayrollDashboard />
            </ProtectedRoute>
          } />
          
          {/* Staff Portal Routes */}
          <Route path="/staff-portal" element={
            <StaffProtectedRoute>
              <StaffPortal />
            </StaffProtectedRoute>
          } />
          <Route path="/staff-portal/time-off" element={
            <StaffProtectedRoute>
              <StaffTimeOff />
            </StaffProtectedRoute>
          } />
          <Route path="/staff-portal/profile" element={
            <StaffProtectedRoute>
              <StaffProfile />
            </StaffProtectedRoute>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
