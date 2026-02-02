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
import Agents from "./pages/admin/Agents";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminLedger from "./pages/admin/AdminLedger";
import Settlements from "./pages/admin/Settlements";
import ApiDocs from "./pages/admin/ApiDocs";
import WebhookLogs from "./pages/admin/WebhookLogs";
import MerchantDashboard from "./pages/merchant/MerchantDashboard";
import MerchantTransactions from "./pages/merchant/MerchantTransactions";
import MerchantLedger from "./pages/merchant/MerchantLedger";
import MerchantSettlements from "./pages/merchant/MerchantSettlements";
import MerchantApiKeys from "./pages/merchant/MerchantApiKeys";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AgentTransactions from "./pages/agent/AgentTransactions";
import AgentSettlements from "./pages/agent/AgentSettlements";
import AgentMerchants from "./pages/agent/AgentMerchants";
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
            <Route path="/admin/agents" element={
              <ProtectedRoute requiredRole="admin">
                <Agents />
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
            <Route path="/admin/ledger" element={
              <ProtectedRoute requiredRole="admin">
                <AdminLedger />
              </ProtectedRoute>
            } />
            <Route path="/admin/api-docs" element={
              <ProtectedRoute requiredRole="admin">
                <ApiDocs />
              </ProtectedRoute>
            } />
            <Route path="/admin/webhooks" element={
              <ProtectedRoute requiredRole="admin">
                <WebhookLogs />
              </ProtectedRoute>
            } />
            
            {/* Agent Routes */}
            <Route path="/agent" element={
              <ProtectedRoute requiredRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/agent/merchants" element={
              <ProtectedRoute requiredRole="agent">
                <AgentMerchants />
              </ProtectedRoute>
            } />
            <Route path="/agent/transactions" element={
              <ProtectedRoute requiredRole="agent">
                <AgentTransactions />
              </ProtectedRoute>
            } />
            <Route path="/agent/settlements" element={
              <ProtectedRoute requiredRole="agent">
                <AgentSettlements />
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
            <Route path="/merchant/settlements" element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantSettlements />
              </ProtectedRoute>
            } />
            <Route path="/merchant/api" element={
              <ProtectedRoute requiredRole="merchant">
                <MerchantApiKeys />
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
