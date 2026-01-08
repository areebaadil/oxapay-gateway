import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Merchants from "./pages/admin/Merchants";
import AdminTransactions from "./pages/admin/AdminTransactions";
import Settlements from "./pages/admin/Settlements";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantTransactions from "./pages/merchant/MerchantTransactions";
import MerchantLedger from "./pages/merchant/MerchantLedger";
import DepositPage from "./pages/deposit/DepositPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/merchants" element={
              <ProtectedRoute requiredRole="admin">
                <Merchants />
              </ProtectedRoute>
            } />
            <Route path="/admin/transactions" element={
              <ProtectedRoute requiredRole="admin">
                <AdminTransactions />
              </ProtectedRoute>
            } />
            <Route path="/admin/settlements" element={
              <ProtectedRoute requiredRole="admin">
                <Settlements />
              </ProtectedRoute>
            } />
            
            {/* Merchant Routes */}
            <Route path="/merchant" element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantDashboard />
              </ProtectedRoute>
            } />
            <Route path="/merchant/transactions" element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantTransactions />
              </ProtectedRoute>
            } />
            <Route path="/merchant/ledger" element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantLedger />
              </ProtectedRoute>
            } />
            
            {/* Hosted Deposit Page (public) */}
            <Route path="/deposit/:intentId" element={<DepositPage />} />
            <Route path="/deposit" element={<DepositPage />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
