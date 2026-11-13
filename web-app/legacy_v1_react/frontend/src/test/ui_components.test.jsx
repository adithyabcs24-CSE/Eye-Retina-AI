import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { TargetSelector } from '../components/TargetSelector/TargetSelector.jsx';
import { DirectCard } from '../components/Results/DirectCard.jsx';
import { IndirectCard } from '../components/Results/IndirectCard.jsx';
import { QualityReport } from '../components/QualityReport/QualityReport.jsx';
import { LoadingSkeleton } from '../components/Layout/LoadingSkeleton.jsx';

describe('Part 3 UI Components & State Tests', () => {

  // 1. Target Selector with 1 target
  test('Target selector with 1 target renders dynamically and sets disabled state for STUB', () => {
    const singleTarget = [
      { id: 'haemoglobin_anaemia', label: 'Haemoglobin', task_type: 'regression', units: 'g/dL', status: 'STUB', pathways: ['direct'] }
    ];
    const onSelect = vi.fn();

    render(
      <TargetSelector
        targets={singleTarget}
        selectedTargetId="haemoglobin_anaemia"
        onSelectTarget={onSelect}
      />
    );

    const select = screen.getByLabelText(/Select Candidate Biomarker Target/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/Haemoglobin \(regression\) \[g\/dL\]/i)).toBeInTheDocument();
    
    // Check that option is disabled because status is STUB
    const option = screen.getByRole('option', { name: /Haemoglobin/i });
    expect(option).toBeDisabled();
  });

  // 2. Target Selector with 6 targets
  test('Target selector with 6 candidate targets dynamically renders all 6 options without hardcoding', () => {
    const sixTargets = [
      { id: 'haemoglobin_anaemia', label: 'Haemoglobin & Anaemia', task_type: 'regression', units: 'g/dL', status: 'STUB', pathways: ['direct'] },
      { id: 'diabetes_status', label: 'Diabetes Status', task_type: 'classification', units: null, status: 'STUB', pathways: ['direct'] },
      { id: 'glucose_regression', label: 'Blood Glucose', task_type: 'regression', units: 'mg/dL', status: 'STUB', pathways: ['direct'] },
      { id: 'diabetic_retinopathy', label: 'Diabetic Retinopathy', task_type: 'classification', units: null, status: 'STUB', pathways: ['direct'] },
      { id: 'hypertension', label: 'Hypertension Risk', task_type: 'classification', units: null, status: 'STUB', pathways: ['direct'] },
      { id: 'cardiovascular_risk', label: 'Cardiovascular Risk', task_type: 'regression', units: '%', status: 'STUB', pathways: ['direct'] }
    ];

    render(
      <TargetSelector
        targets={sixTargets}
        selectedTargetId=""
        onSelectTarget={vi.fn()}
      />
    );

    const options = screen.getAllByRole('option');
    // 1 default prompt option + 6 target options = 7
    expect(options).toHaveLength(7);
    expect(screen.getByText(/Diabetes Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Blood Glucose/i)).toBeInTheDocument();
    expect(screen.getByText(/Diabetic Retinopathy/i)).toBeInTheDocument();
    expect(screen.getByText(/Hypertension Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiovascular Risk/i)).toBeInTheDocument();
  });

  // 3. Direct Card: STUB Demo State
  test('DirectCard STUB state displays demo banner, null prediction notice, and clinical disclaimer', () => {
    const stubResult = {
      status: 'stub',
      target_id: 'haemoglobin_anaemia',
      task_type: 'regression',
      prediction: null,
      units: 'g/dL',
      model_version: '0.1.0-stub',
      latency_ms: 1.25,
      warnings: ['Demo mode: no trained model loaded.', 'Research prototype. Not a medical diagnosis.']
    };

    render(
      <DirectCard
        result={stubResult}
        targetMeta={{ label: 'Haemoglobin & Anaemia' }}
      />
    );

    expect(screen.getByText(/Pathway A \(Direct Prediction\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Demo mode: no trained model loaded/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/0\.1\.0-stub/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.25 ms/i)).toBeInTheDocument();
  });

  // 4. Direct Card: LOADED state
  test('DirectCard LOADED state displays prediction value, units, latency, and model version', () => {
    const loadedResult = {
      status: 'loaded',
      target_id: 'haemoglobin_anaemia',
      task_type: 'regression',
      prediction: 13.8,
      units: 'g/dL',
      model_version: 'ResNet50_v2',
      latency_ms: 4.5,
      warnings: ['Research prototype. Not a medical diagnosis.']
    };

    render(
      <DirectCard
        result={loadedResult}
        targetMeta={{ label: 'Haemoglobin' }}
      />
    );

    expect(screen.getByText('13.8 g/dL')).toBeInTheDocument();
    expect(screen.getByText(/ResNet50_v2/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.5 ms/i)).toBeInTheDocument();
  });

  // 5. Indirect Card: UNAVAILABLE state
  test('IndirectCard displays blocked state when pathway_b_available is false', () => {
    render(
      <IndirectCard
        result={null}
        targetMeta={{ label: 'Haemoglobin' }}
        pathwayBAvailable={false}
      />
    );

    expect(screen.getByText(/Pathway B is Formally Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/UNAVAILABLE/i)).toBeInTheDocument();
  });

  // 6. Indirect Card: LOADED with permanent non-removable disclaimer label
  test('IndirectCard displays permanent disclaimer label on generated fundus image', () => {
    const indirectResult = {
      status: 'loaded',
      target_id: 'haemoglobin_anaemia',
      task_type: 'regression',
      prediction: 12.5,
      units: 'g/dL',
      model_version: 'Pix2Pix_v1',
      generated_image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=',
      generated_image_warning: 'AI-generated. May not reflect the real retina.'
    };

    render(
      <IndirectCard
        result={indirectResult}
        targetMeta={{ label: 'Haemoglobin' }}
        pathwayBAvailable={true}
      />
    );

    // Strict Rule 10 check: permanent label must be in document
    const label = screen.getByText('AI-generated. May not reflect the real retina.');
    expect(label).toBeInTheDocument();
    expect(screen.getByAltText(/synthetic fundus/i)).toBeInTheDocument();
  });

  // 7. Quality Report: Passed state
  test('QualityReport passed state renders checks table and proceed button', () => {
    const passedReport = {
      passed: true,
      checks: [
        { name: 'min_resolution', value: 256, threshold: 128, passed: true },
        { name: 'sharpness_laplacian', value: 150.0, threshold: 30.0, passed: true }
      ],
      reasons: []
    };
    const onProceed = vi.fn();

    render(
      <QualityReport
        report={passedReport}
        onProceed={onProceed}
        onRetake={vi.fn()}
      />
    );

    expect(screen.getByText(/External-Eye Quality Gate Passed/i)).toBeInTheDocument();
    const proceedBtn = screen.getByRole('button', { name: /Proceed to Inference Analysis/i });
    expect(proceedBtn).toBeInTheDocument();
    fireEvent.click(proceedBtn);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  // 8. Quality Report: Rejected state with actionable guidance
  test('QualityReport rejected state shows reasons, guidance, and blocks prediction', () => {
    const failedReport = {
      passed: false,
      checks: [
        { name: 'sharpness_laplacian', value: 12.0, threshold: 30.0, passed: false }
      ],
      reasons: ['Image sharpness score (12.0) is below threshold (30.0); image is blurry.']
    };
    const onRetake = vi.fn();

    render(
      <QualityReport
        report={failedReport}
        onProceed={vi.fn()}
        onRetake={onRetake}
      />
    );

    expect(screen.getByText(/External-Eye Quality Gate Rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/image is blurry/i)).toBeInTheDocument();
    expect(screen.getByText(/Actionable Guidance for Re-taking/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Proceed to Inference/i })).not.toBeInTheDocument();
    
    const retakeBtn = screen.getByRole('button', { name: /Upload a New Photograph/i });
    expect(retakeBtn).toBeInTheDocument();
    fireEvent.click(retakeBtn);
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  // 9. Loading Skeleton accessibility
  test('LoadingSkeleton renders with accessible role status and aria-busy', () => {
    render(<LoadingSkeleton lines={3} />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });
});
