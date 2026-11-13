import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PathwayComparisonView } from '../components/Results/PathwayComparisonView.jsx';
import { MetricsDashboardPage } from '../pages/MetricsDashboardPage.jsx';
import { GradCAMViewer } from '../components/Explainability/GradCAMViewer.jsx';
import { RobustnessLab } from '../components/Robustness/RobustnessLab.jsx';
import { ModelCardPage } from '../pages/ModelCardPage.jsx';
import { QualityReport } from '../components/QualityReport/QualityReport.jsx';
import { PrintableReport } from '../components/Report/PrintableReport.jsx';
import { SessionHistory } from '../components/History/SessionHistory.jsx';
import { ResearcherPortalPage } from '../pages/ResearcherPortalPage.jsx';
import { Tooltip } from '../components/Common/Tooltip.jsx';
import { apiClient } from '../services/apiClient.js';
import i18n from '../i18n.js';

describe('Part 4 Advanced Features Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Feature 1: Pathway Comparison View
  it('1. Pathway comparison view renders side-by-side outputs, disagreement indicator, and separate population panel', () => {
    const mockPredictResult = {
      direct: {
        status: 'stub',
        target_id: 'haemoglobin_anaemia',
        task_type: 'regression',
        prediction: null,
        units: 'g/dL',
        model_version: 'ResNet50_STUB',
        latency_ms: 12.4,
        warnings: []
      },
      indirect: {
        status: 'stub',
        target_id: 'haemoglobin_anaemia',
        task_type: 'regression',
        prediction: null,
        units: 'g/dL',
        model_version: 'UNAVAILABLE',
        latency_ms: 0,
        warnings: []
      },
      disagreement_summary: {
        delta: null,
        relative_difference_pct: null,
        clinical_discordance: false,
        note: 'Pathway B unavailable: Paired dataset not found.'
      }
    };

    render(
      <PathwayComparisonView
        predictResult={mockPredictResult}
        targetMeta={{ label: 'Haemoglobin' }}
        pathwayBAvailable={false}
        populationMetrics={null}
      />
    );

    // Direct card
    expect(screen.getByText('Pathway A (Direct Prediction)')).toBeInTheDocument();
    // Indirect card
    expect(screen.getByText('Pathway B (Indirect Reconstruction)')).toBeInTheDocument();
    // Disagreement indicator
    expect(screen.getByText(/Disagreement Assessment/i)).toBeInTheDocument();
    // Separate population panel label
    expect(screen.getByText('Population-level results, not the accuracy of this prediction')).toBeInTheDocument();
    // Empty state when metrics JSON has no paired comparison
    expect(screen.getByText(/No population-level paired comparison benchmark files have been logged/i)).toBeInTheDocument();
  });

  // Feature 2: Metrics Dashboard
  it('2. Metrics dashboard shows empty state "Not yet evaluated" when metrics are missing', async () => {
    vi.spyOn(apiClient, 'getMetrics').mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <MetricsDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Not yet evaluated')).toBeInTheDocument();
    });
    expect(screen.getByText(/Per project anti-hallucination rules, mock or speculative statistical curves/i)).toBeInTheDocument();
  });

  // Feature 3: Reconstruction Fidelity Panel
  it('3. Reconstruction fidelity panel shows caveat that metrics do NOT prove anatomical correctness', () => {
    const mockMetricsWithFidelity = {
      reconstruction_fidelity: {
        l1: 0.042,
        psnr: 28.5,
        ssim: 0.89
      }
    };

    render(
      <PathwayComparisonView
        predictResult={{ direct: { status: 'stub' }, indirect: { status: 'stub' } }}
        targetMeta={{ label: 'Haemoglobin' }}
        pathwayBAvailable={false}
        populationMetrics={mockMetricsWithFidelity}
      />
    );

    expect(screen.getByText('Reconstruction Fidelity')).toBeInTheDocument();
    expect(screen.getByText('28.5 dB')).toBeInTheDocument();
    expect(screen.getByText(/prove or guarantee anatomical correctness of retinal microvasculature/i)).toBeInTheDocument();
  });

  // Feature 4: Real-vs-Generated Explorer
  it('4. Real-vs-generated explorer displays BLOCKED when no local test pairs folder is supplied', async () => {
    vi.spyOn(apiClient, 'getResearcherSummary').mockResolvedValueOnce({
      latency_percentiles_ms: { p50: 100, p95: 150, p99: 200 },
      error_metrics: { total_requests: 10, client_error_400: 0, pathway_unavailable_409: 0, server_error_500: 0 },
      experiment_logs: []
    });

    render(<ResearcherPortalPage />);

    // Authenticate
    fireEvent.change(screen.getByLabelText(/Researcher Token:/i), { target: { value: 'research-token-2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Real-vs-Generated Explorer/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No researcher-supplied held-out test pairs folder located in local repository/i)).toBeInTheDocument();
  });

  // Feature 5: Explainability (Grad-CAM)
  it('5. Grad-CAM displays caveat and is BLOCKED when model is in STUB state', async () => {
    vi.spyOn(apiClient, 'getGradCAM').mockResolvedValueOnce({
      status: 'not_available',
      message: 'Grad-CAM explanation is not available: direct prediction model is in STUB state.'
    });

    render(
      <GradCAMViewer
        file={new File(['test'], 'eye.png', { type: 'image/png' })}
        targetId="haemoglobin_anaemia"
        previewUrl="blob:http://localhost/test"
      />
    );

    // Caveat is always visible
    expect(screen.getByText(/shows where the model looked, not causal evidence/i)).toBeInTheDocument();

    // Toggle on
    fireEvent.click(screen.getByRole('button', { name: /Enable Grad-CAM Overlay/i }));

    await waitFor(() => {
      expect(screen.getByText(/Grad-CAM explanation is not available: direct prediction model is in STUB state/i)).toBeInTheDocument();
    });
  });

  // Feature 6: Robustness Lab
  it('6. Robustness lab renders sliders for blur, brightness, and noise with perturbation canvas', () => {
    render(
      <RobustnessLab
        file={new File(['test'], 'eye.png', { type: 'image/png' })}
        targetId="haemoglobin_anaemia"
        baselineResult={null}
      />
    );

    expect(screen.getByText(/Robustness Lab/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Blur perturbation slider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Brightness perturbation slider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Additive sensor noise slider/i)).toBeInTheDocument();
    expect(screen.getByText(/Re-Run Prediction on Perturbed Image/i)).toBeInTheDocument();
  });

  // Feature 7: Model Card Page
  it('7. Model card page displays training data, intended use, out-of-scope use, and Section 15 limitations', async () => {
    vi.spyOn(apiClient, 'getModelCard').mockResolvedValueOnce({
      versions: { direct_encoder: 'ResNet50_STUB' },
      training_data: { name: 'Synthetic Fixtures', provenance: 'Non-patient synthetic images', pairs_verified: false },
      intended_use: 'Investigational research prototype for feasibility benchmarking.',
      out_of_scope_use: 'Clinical patient diagnosis, triage, or screening.',
      limitations: ['Optical barrier: External photography captures anterior eye segment only.'],
      evaluation_date: 'Pending formal benchmark run'
    });
    vi.spyOn(apiClient, 'getMetrics').mockResolvedValueOnce([]);

    render(<ModelCardPage />);

    await waitFor(() => {
      expect(screen.getByText('Investigational research prototype for feasibility benchmarking.')).toBeInTheDocument();
    });
    expect(screen.getByText(/Clinical patient diagnosis, triage, or screening/i)).toBeInTheDocument();
    expect(screen.getByText(/Optical barrier: External photography captures anterior eye segment only/i)).toBeInTheDocument();
  });

  // Feature 8: Uncertainty/Confidence Display
  it('8. Uncertainty display is omitted when model card has no calibration definition', async () => {
    vi.spyOn(apiClient, 'getModelCard').mockResolvedValueOnce({
      versions: { direct_encoder: 'ResNet50_STUB' },
      intended_use: 'Testing',
      out_of_scope_use: 'Diagnosis',
      limitations: []
      // uncertainty_definition omitted
    });
    vi.spyOn(apiClient, 'getMetrics').mockResolvedValueOnce([]);

    render(<ModelCardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Model Card & Scientific Evaluation Bounds/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Uncertainty & Confidence Calibration/i)).toBeNull();
  });

  // Feature 9: Image-Quality Coaching
  it('9. Image-quality coaching outputs targeted per-check tips after failed checks', () => {
    const failedReport = {
      passed: false,
      checks: [
        { name: 'blur', value: '14.2', threshold: '30.0', passed: false },
        { name: 'glare', value: '0.22', threshold: '0.15', passed: false }
      ],
      reasons: ['Variance of Laplacian (14.2) below threshold', 'Glare ratio (0.22) exceeds maximum threshold']
    };

    render(<QualityReport report={failedReport} onProceed={() => {}} onRetake={() => {}} />);

    expect(screen.getByText(/Actionable Guidance for Re-taking & Coaching Tips/i)).toBeInTheDocument();
    expect(screen.getByText(/Too blurry: Hold the camera steady with both hands/i)).toBeInTheDocument();
    expect(screen.getByText(/Excessive specular glare\/flash reflection: Turn off direct camera flash/i)).toBeInTheDocument();
  });

  // Feature 10: Downloadable Result Report
  it('10. Downloadable result report contains thumbnail, outputs, timestamp, disclaimer, and NO identity fields', () => {
    const mockResult = {
      direct: {
        status: 'LOADED',
        target_id: 'haemoglobin_anaemia',
        task_type: 'regression',
        prediction: 13.8,
        units: 'g/dL',
        model_version: 'ResNet50_v1',
        latency_ms: 45
      },
      indirect: {
        status: 'UNAVAILABLE',
        target_id: 'haemoglobin_anaemia',
        prediction: null
      }
    };

    render(
      <PrintableReport
        predictResult={mockResult}
        targetMeta={{ label: 'Haemoglobin & Anaemia' }}
        previewUrl="data:image/png;base64,mockThumbnail"
        timestamp="2026-10-31T12:00:00Z"
      />
    );

    expect(screen.getByText(/Experimental Inference Summary/i)).toBeInTheDocument();
    expect(screen.getByText('2026-10-31T12:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('13.8 g/dL')).toBeInTheDocument();
    expect(screen.getByText(/Research prototype. Not a medical diagnosis/i)).toBeInTheDocument();
    // Zero identity fields
    expect(screen.queryByText(/Patient Name/i)).toBeNull();
    expect(screen.queryByText(/Medical Record Number/i)).toBeNull();
  });

  // Feature 11: Session-Only History
  it('11. Session-only history keeps entries in volatile memory and clears on button click', () => {
    const mockHistory = [
      { id: 1, time: '12:00:01 PM', targetLabel: 'Haemoglobin', status: 'STUB', prediction: null, units: 'g/dL', latencyMs: 25 },
      { id: 2, time: '12:01:05 PM', targetLabel: 'Diabetes', status: 'STUB', prediction: null, units: null, latencyMs: 30 }
    ];

    const clearMock = vi.fn();
    const { rerender } = render(<SessionHistory history={mockHistory} onClearHistory={clearMock} />);

    expect(screen.getByText('Haemoglobin')).toBeInTheDocument();
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
    expect(screen.getByText(/All records reside exclusively in browser tab memory/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear all entries from tab memory/i }));
    expect(clearMock).toHaveBeenCalledTimes(1);

    // Re-render empty
    rerender(<SessionHistory history={[]} onClearHistory={clearMock} />);
    expect(screen.getByText(/No inference runs executed in this tab session yet/i)).toBeInTheDocument();
  });

  // Feature 12: Researcher Page Behind Env Token
  it('12. Researcher page protects telemetry behind token and shows latency percentiles and error metrics', async () => {
    vi.spyOn(apiClient, 'getResearcherSummary').mockResolvedValueOnce({
      latency_percentiles_ms: { p50: 142.5, p95: 185.0, p99: 210.0 },
      error_metrics: { total_requests: 128, client_error_400: 4, pathway_unavailable_409: 6, server_error_500: 0 },
      experiment_logs: [{ filename: 'run_01.json', data: { epoch: 10, loss: 0.12 } }]
    });

    render(<ResearcherPortalPage />);

    // Shows token form initially
    expect(screen.getByText(/Protected investigator console/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Researcher Token:/i), { target: { value: 'research-token-2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByText('142.5 ms')).toBeInTheDocument();
    });
    expect(screen.getByText('185 ms')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('run_01.json')).toBeInTheDocument();
  });

  // Feature 13: Failure-Case Gallery
  it('13. Failure-case gallery displays BLOCKED when no folder is supplied', async () => {
    vi.spyOn(apiClient, 'getResearcherSummary').mockResolvedValueOnce({
      latency_percentiles_ms: { p50: 100, p95: 150, p99: 200 },
      error_metrics: { total_requests: 10, client_error_400: 0, pathway_unavailable_409: 0, server_error_500: 0 },
      experiment_logs: []
    });

    render(<ResearcherPortalPage />);

    fireEvent.change(screen.getByLabelText(/Researcher Token:/i), { target: { value: 'research-token-2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failure-Case Gallery/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No researcher-supplied failure-case folder located in local repository/i)).toBeInTheDocument();
  });

  // Feature 14: Dark Mode & i18n
  it('14. i18next initializes English translations with medical review flag', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.t('app.disclaimer')).toBe('Research prototype. Not a medical diagnosis.');
    expect(i18n.t('tooltips.sensitivity')).toContain('True Positive Rate');
  });

  // Feature 15: Guided Tour / Term Tooltips
  it('15. Guided tour tooltips display plain-language definition upon trigger interaction', async () => {
    render(
      <Tooltip
        term="Sensitivity"
        text="The proportion of actual positive cases correctly identified."
      />
    );

    const trigger = screen.getByRole('button', { name: /Definition for Sensitivity/i });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(/The proportion of actual positive cases correctly identified/i)).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
