import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient.js';
import { TargetSelector } from '../components/TargetSelector/TargetSelector.jsx';
import { QualityReport } from '../components/QualityReport/QualityReport.jsx';
import { LoadingSkeleton } from '../components/Layout/LoadingSkeleton.jsx';
import { PathwayComparisonView } from '../components/Results/PathwayComparisonView.jsx';
import { GradCAMViewer } from '../components/Explainability/GradCAMViewer.jsx';
import { RobustnessLab } from '../components/Robustness/RobustnessLab.jsx';
import { PrintableReport } from '../components/Report/PrintableReport.jsx';
import { SessionHistory } from '../components/History/SessionHistory.jsx';
import styles from './WorkbenchPage.module.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

export function WorkbenchPage() {
  // State: Capabilities & Target
  const [capabilities, setCapabilities] = useState(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState('');

  // State: Upload & Preview
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [clientError, setClientError] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // State: Quality Gate
  const [qualityChecking, setQualityChecking] = useState(false);
  const [qualityReport, setQualityReport] = useState(null);

  // State: Inference Prediction
  const [predicting, setPredicting] = useState(false);
  const [predictResult, setPredictResult] = useState(null);
  const [predictError, setPredictError] = useState(null);

  // State: Population Metrics & Session History
  const [populationMetrics, setPopulationMetrics] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);

  // Fetch capabilities & metrics dynamically on mount per Anti-Hallucination Rule 4
  useEffect(() => {
    let mounted = true;
    Promise.all([apiClient.getCapabilities(), apiClient.getMetrics()])
      .then(([capData, metricsData]) => {
        if (mounted) {
          setCapabilities(capData);
          setCapabilitiesLoading(false);
          const firstAvailable = capData?.targets?.find(t => t.status === 'LOADED') || capData?.targets?.[0];
          if (firstAvailable) {
            setSelectedTargetId(firstAvailable.id);
          }
          if (metricsData && metricsData.length > 0) {
            setPopulationMetrics(metricsData[0]);
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setCapabilitiesLoading(false);
          setClientError({ code: err.code, message: `Failed to load system capabilities: ${err.message}` });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Validate and set file
  const handleFileSelect = (selectedFile) => {
    setClientError(null);
    setQualityReport(null);
    setPredictResult(null);
    setPredictError(null);

    if (!selectedFile) return;

    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setClientError({
        code: 'CLIENT_TYPE_ERROR',
        message: 'Invalid file format. Please upload an external photograph in JPEG or PNG format.'
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setClientError({
        code: 'CLIENT_SIZE_ERROR',
        message: 'File size exceeds maximum allowable limit of 10 MB.'
      });
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Step 1: Run Quality Inspection Gate
  const handleRunQualityCheck = async () => {
    if (!file) return;
    setQualityChecking(true);
    setClientError(null);
    setQualityReport(null);

    try {
      const report = await apiClient.checkQuality(file);
      setQualityReport(report);
      setQualityChecking(false);
    } catch (err) {
      setQualityChecking(false);
      setClientError({ code: err.code, message: err.message });
    }
  };

  // Step 2: Run Inference Prediction (Direct and Compare)
  const handleRunInference = async () => {
    if (!file || !selectedTargetId) return;
    setPredicting(true);
    setPredictError(null);
    setPredictResult(null);

    try {
      const res = await apiClient.predictCompare(file, selectedTargetId);
      setPredictResult(res);
      setPredicting(false);

      // Feature 11: Session-only history update in volatile tab state
      const targetMeta = capabilities?.targets?.find(t => t.id === selectedTargetId);
      setSessionHistory(prev => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          targetLabel: targetMeta?.label || selectedTargetId,
          status: res.direct?.status || 'N/A',
          prediction: res.direct?.prediction,
          units: res.direct?.units,
          latencyMs: res.direct?.latency_ms ?? 0
        },
        ...prev
      ]);
    } catch (err) {
      setPredicting(false);
      setPredictError({ code: err.code, message: err.message });
    }
  };

  const selectedTargetMeta = capabilities?.targets?.find(t => t.id === selectedTargetId);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          Inference & Evaluation Workbench
        </h2>
        <p className={styles.subtitle}>
          Upload an external-eye photograph, review clinical quality metrics, and evaluate direct vs cross-modal estimation.
        </p>
      </header>

      {/* Photography Guidelines Banner */}
      <section className={styles.guidelinesSection}>
        <h3 className={styles.guidelinesTitle}>
          External-Eye Photography Guidelines:
        </h3>
        <ul className={styles.guidelinesGrid}>
          <li>✓ <strong>Even Ambient Lighting:</strong> Avoid sharp shadows.</li>
          <li>✓ <strong>In Sharp Focus:</strong> Steady camera lens.</li>
          <li>✓ <strong>Eye Wide Open:</strong> Palpebral conjunctiva clear.</li>
          <li>✓ <strong>No Flash Glare:</strong> Prevent corneal/scleral saturation.</li>
          <li>✓ <strong>Raw Capture:</strong> No beauty filters or retouching.</li>
        </ul>
      </section>

      {/* Target Selector */}
      <TargetSelector
        targets={capabilities?.targets || []}
        selectedTargetId={selectedTargetId}
        onSelectTarget={setSelectedTargetId}
        disabled={qualityChecking || predicting}
        loading={capabilitiesLoading}
      />

      {/* Upload Zone (Drag-and-Drop + File Picker) */}
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
      >
        <input
          type="file"
          id="photo-upload-input"
          accept="image/jpeg,image/png"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          className={styles.fileInput}
        />
        <label htmlFor="photo-upload-input" className={styles.dropZoneLabel}>
          <div className={styles.cameraIcon}>📷</div>
          <p className={styles.dropPrompt}>
            {file ? file.name : 'Drag and drop an external-eye photograph here, or click to browse'}
          </p>
          <p className={styles.dropHint}>
            Permitted formats: JPEG, PNG. Maximum file size: 10 MB. Never upload retinal fundus images.
          </p>
        </label>
      </section>

      {/* Live Image Preview */}
      {previewUrl && (
        <div className={styles.previewContainer}>
          <img
            src={previewUrl}
            alt="External-eye photograph preview"
            className={styles.previewImg}
          />
          <div>
            <p className={styles.previewFileName}>{file?.name}</p>
            <p className={styles.previewMeta}>
              Size: {((file?.size || 0) / (1024 * 1024)).toFixed(2)} MB | Type: {file?.type}
            </p>
            <p className={styles.previewLoadedTag}>
              ✓ Loaded securely in client memory. Not yet submitted to server.
            </p>
          </div>
        </div>
      )}

      {/* Mandatory Consent Checkbox */}
      <div className={styles.consentContainer}>
        <label className={styles.consentLabel}>
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className={styles.consentCheckbox}
          />
          <span className={styles.consentText}>
            <strong>Informed Research Consent:</strong> I understand this is a research prototype and my image is processed in volatile server memory but not stored.
          </span>
        </label>
      </div>

      {/* Client Validation Errors */}
      {clientError && (
        <div role="alert" className={styles.clientErrorBox}>
          <strong>{clientError.code}:</strong> {clientError.message}
        </div>
      )}

      {/* Action Button: Run Quality Check */}
      <div className={styles.actionRow}>
        <button
          onClick={handleRunQualityCheck}
          disabled={!file || !consentGiven || qualityChecking || predicting}
          className={(!file || !consentGiven || qualityChecking || predicting) ? styles.btnDisabled : styles.btnPrimary}
        >
          {qualityChecking ? 'Inspecting Image Quality...' : '1. Run Quality Gate Inspection'}
        </button>
      </div>

      {/* Loading Skeleton during Quality Inspection */}
      {qualityChecking && (
        <div className={styles.skeletonSection}>
          <p className={styles.skeletonTitle}>Evaluating external-eye focus, glare, and resolution...</p>
          <LoadingSkeleton lines={4} height="2rem" />
        </div>
      )}

      {/* Step 2: Quality Inspection Report (with Feature 9 Coaching Tips) */}
      {qualityReport && (
        <QualityReport
          report={qualityReport}
          onProceed={handleRunInference}
          onRetake={() => {
            setFile(null);
            setPreviewUrl(null);
            setQualityReport(null);
            setPredictResult(null);
          }}
        />
      )}

      {/* Loading Skeleton during Inference */}
      {predicting && (
        <div className={styles.skeletonSection}>
          <p className={styles.skeletonTitle}>Executing direct CNN inference and cross-modal translation...</p>
          <LoadingSkeleton lines={5} height="2.5rem" />
        </div>
      )}

      {/* Inference Error View */}
      {predictError && (
        <div role="alert" className={styles.serverErrorBox}>
          <strong>Inference Failed [{predictError.code}]:</strong> {predictError.message}
        </div>
      )}

      {/* Step 3: Pathway Comparison View & Fidelity Assessment */}
      {predictResult && (
        <>
          <PathwayComparisonView
            predictResult={predictResult}
            targetMeta={selectedTargetMeta}
            pathwayBAvailable={capabilities?.pathway_b_available || false}
            populationMetrics={populationMetrics}
          />

          {/* Feature 5: Explainability (Grad-CAM Overlay) */}
          <GradCAMViewer
            file={file}
            targetId={selectedTargetId}
            previewUrl={previewUrl}
          />

          {/* Feature 6: Robustness Lab */}
          <RobustnessLab
            file={file}
            targetId={selectedTargetId}
            baselineResult={predictResult}
          />

          {/* Feature 10: Downloadable / Printable Result Report */}
          <PrintableReport
            predictResult={predictResult}
            targetMeta={selectedTargetMeta}
            previewUrl={previewUrl}
          />
        </>
      )}

      {/* Feature 11: Session-Only History View */}
      <SessionHistory
        history={sessionHistory}
        onClearHistory={() => setSessionHistory([])}
      />
    </div>
  );
}
