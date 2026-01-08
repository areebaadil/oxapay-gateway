import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/merchants" element={<Merchants />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/settlements" element={<Settlements />} />
          
          {/* Merchant Routes */}
          <Route path="/merchant" element={<MerchantDashboard />} />
          <Route path="/merchant/transactions" element={<MerchantTransactions />} />
          <Route path="/merchant/ledger" element={<MerchantLedger />} />
          
          {/* Hosted Deposit Page */}
          <Route path="/deposit/:intentId" element={<DepositPage />} />
          <Route path="/deposit" element={<DepositPage />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
