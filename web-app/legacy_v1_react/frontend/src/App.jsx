import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Layout/Header.jsx';
import { Footer } from './components/Layout/Footer.jsx';
import { ErrorBoundary } from './components/Layout/ErrorBoundary.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { WorkbenchPage } from './pages/WorkbenchPage.jsx';
import { MetricsDashboardPage } from './pages/MetricsDashboardPage.jsx';
import { ModelCardPage } from './pages/ModelCardPage.jsx';
import { ResearcherPortalPage } from './pages/ResearcherPortalPage.jsx';
import './styles/variables.css';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main id="main-content" style={{ flex: 1 }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/workbench" element={<WorkbenchPage />} />
              <Route path="/metrics" element={<MetricsDashboardPage />} />
              <Route path="/model-card" element={<ModelCardPage />} />
              <Route path="/researcher" element={<ResearcherPortalPage />} />
              <Route
                path="*"
                element={
                  <div style={{ padding: '3rem', textAlign: 'center' }}>
                    <h2>404 - Page Not Found</h2>
                    <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                      The requested route does not exist.
                    </p>
                  </div>
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
