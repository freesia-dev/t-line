import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Konfigurasi from "./pages/Konfigurasi";
import About from "./pages/About";
import CSCaller from "./pages/CSCaller";
import TellerCaller from "./pages/TellerCaller";
import QueueDisplay from "./pages/QueueDisplay";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/konfigurasi" element={<Konfigurasi />} />
          <Route path="/cs-caller" element={<CSCaller />} />
          <Route path="/teller-caller" element={<TellerCaller />} />
          <Route path="/display" element={<QueueDisplay />} />
          <Route path="/install" element={<Install />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
