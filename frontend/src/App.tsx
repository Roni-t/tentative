import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { StarField } from './components/StarField';
import { CursorTrail } from './components/FluidTrail';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { RequireAuth } from './components/RequireAuth';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { CreateAccountPage } from './pages/CreateAccountPage';
import { MyEventsPage } from './pages/MyEventsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { RespondAvailabilityPage } from './pages/RespondAvailabilityPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { FinalizePage } from './pages/FinalizePage';
import { RsvpListPage } from './pages/RsvpListPage';
import { ShareExpiryPage } from './pages/ShareExpiryPage';
import { RecurrencePage } from './pages/RecurrencePage';
import { AdminPage } from './pages/AdminPage';
import { BugReportPage } from './pages/BugReportPage';
import { ExpiredOrbitPage } from './pages/ExpiredOrbitPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPolicyPage, TermsPage } from './pages/LegalPage';

// Helper component that redirects /share/:token to /share/:token/heatmap
const ShareRedirect: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={`/share/${token}/heatmap`} replace />;
};

// Shows its children only on the landing page
const LandingOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  return pathname === '/' ? <>{children}</> : null;
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  // Start every page at the top. This jumps instantly, because a smooth scroll made the landing page
  // look blank (its hero fades out with scroll position).
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // The new page replaces the old one right away and fades in. Earlier the old page had to fade out first,
  // which left the screen close to blank on every click, and clicking quickly made it worse.
  return (
    <>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="route-view w-full flex-1 flex flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<CreateAccountPage />} />
          <Route path="/events" element={<RequireAuth><MyEventsPage /></RequireAuth>} />
          <Route path="/create" element={<CreateEventPage />} />

          {/* Event Details & Functional Views */}
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events/:id/respond" element={<RespondAvailabilityPage />} />
          <Route path="/events/:id/heatmap" element={<HeatmapPage />} />
          <Route path="/events/:id/finalize" element={<RequireAuth><FinalizePage /></RequireAuth>} />
          <Route path="/events/:id/rsvps" element={<RsvpListPage />} />
          <Route path="/events/:id/share" element={<RequireAuth><ShareExpiryPage /></RequireAuth>} />
          <Route path="/events/:id/recurrence" element={<RequireAuth><RecurrencePage /></RequireAuth>} />

          {/* Shareable Link Routes (Invitee Anonymous Routes) */}
          <Route path="/share/:token" element={<ShareRedirect />} />
          <Route path="/share/:token/respond" element={<RespondAvailabilityPage />} />
          <Route path="/share/:token/heatmap" element={<HeatmapPage />} />
          <Route path="/share/:token/finalize" element={<FinalizePage />} />

          {/* System & Extra Views */}
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          <Route path="/bug-report" element={<BugReportPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/expired" element={<ExpiredOrbitPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </>
  );
};

// Tells the glass top bar where the cursor is so its shine can follow it
const useGlassShine = () => {
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.('.glass-pill-nav') as HTMLElement | null;
      if (!el) return;
      const box = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - box.left}px`);
      el.style.setProperty('--my', `${e.clientY - box.top}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
};

export const App: React.FC = () => {
  useGlassShine();
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="relative min-h-screen flex flex-col bg-black text-zinc-100 selection:bg-white/20 selection:text-white">
            {/* Ambient Celestial Starfield */}
            <StarField />
            <LandingOnly>
              <CursorTrail />
            </LandingOnly>

            {/* Sticky Navigation Bar */}
            <Navbar />

            {/* Notification Toasts */}
            <ToastContainer />

            {/* Content Routes with Smooth Page Transitions */}
            <main className="flex-1 relative z-10 flex flex-col">
              <AnimatedRoutes />
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
