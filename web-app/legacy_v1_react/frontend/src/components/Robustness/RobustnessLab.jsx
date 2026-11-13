import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../services/apiClient.js';
import styles from './RobustnessLab.module.css';

export function RobustnessLab({ file, targetId, baselineResult }) {
  const [blur, setBlur] = useState(0); // 0 to 10px
  const [brightness, setBrightness] = useState(100); // 50% to 150%
  const [noise, setNoise] = useState(0); // 0% to 50%

  const [running, setRunning] = useState(false);
  const [perturbedResult, setPerturbedResult] = useState(null);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const imageObjRef = useRef(null);

  // Load image into HTMLImageElement
  useEffect(() => {
    if (!file) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      imageObjRef.current = img;
      renderPerturbations();
    };
  }, [file]);

  // Re-render perturbation on canvas
  const renderPerturbations = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth || 224;
    canvas.height = img.naturalHeight || 224;
    const ctx = canvas.getContext('2d');

    // Apply CSS filter for blur and brightness
    ctx.filter = `blur(${blur}px) brightness(${brightness}%)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Apply additive noise if > 0
    if (noise > 0) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const noiseFactor = (noise / 100) * 128;

      for (let i = 0; i < data.length; i += 4) {
        const rand = (Math.random() - 0.5) * noiseFactor;
        data[i] = Math.min(255, Math.max(0, data[i] + rand));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + rand));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + rand));
      }
      ctx.putImageData(imgData, 0, 0);
    }
  };

  useEffect(() => {
    renderPerturbations();
  }, [blur, brightness, noise]);

  const handleReset = () => {
    setBlur(0);
    setBrightness(100);
    setNoise(0);
    setPerturbedResult(null);
    setError(null);
  };

  const handleRunRobustnessTest = () => {
    const canvas = canvasRef.current;
    if (!canvas || !targetId) return;

    setRunning(true);
    setError(null);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setRunning(false);
        setError('Failed to extract image buffer from canvas.');
        return;
      }

      const perturbedFile = new File([blob], 'perturbed_eye.png', { type: 'image/png' });

      try {
        const res = await apiClient.predictCompare(perturbedFile, targetId);
        setPerturbedResult(res);
      } catch (err) {
        setError(err.message || 'Robustness inference failed.');
      } finally {
        setRunning(false);
      }
    }, 'image/png');
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>
        <span>🧪</span> Robustness Lab (Perturbation Stress-Testing)
      </h4>
      <p className={styles.description}>
        Stress-test inference resilience against optical degradation (blur), variable illumination (brightness), and sensor thermal noise. Directly addresses the research question of model stability.
      </p>

      {/* Sliders */}
      <div className={styles.controlsGrid}>
        <div className={styles.sliderGroup}>
          <label className={styles.sliderLabel}>
            <span>Gaussian Blur</span>
            <span>{blur} px</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={blur}
            onChange={(e) => setBlur(parseFloat(e.target.value))}
            className={styles.slider}
            aria-label="Blur perturbation slider"
          />
        </div>

        <div className={styles.sliderGroup}>
          <label className={styles.sliderLabel}>
            <span>Brightness Scale</span>
            <span>{brightness}%</span>
          </label>
          <input
            type="range"
            min="50"
            max="150"
            step="5"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
            className={styles.slider}
            aria-label="Brightness perturbation slider"
          />
        </div>

        <div className={styles.sliderGroup}>
          <label className={styles.sliderLabel}>
            <span>Sensor Noise</span>
            <span>{noise}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="2"
            value={noise}
            onChange={(e) => setNoise(parseInt(e.target.value, 10))}
            className={styles.slider}
            aria-label="Additive sensor noise slider"
          />
        </div>
      </div>

      {/* Live Canvas Preview */}
      <div className={styles.previewGrid}>
        <div className={styles.previewCard}>
          <div className={styles.previewCardTitle}>Real-Time Perturbation Canvas</div>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionRow}>
        <button
          type="button"
          onClick={handleRunRobustnessTest}
          disabled={running || !file}
          className={styles.btnRun}
        >
          {running ? 'Re-evaluating under Perturbations...' : 'Re-Run Prediction on Perturbed Image'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={styles.btnReset}
        >
          Reset Sliders
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: 'var(--color-danger-text)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Outcome Comparison */}
      {perturbedResult && (
        <div className={styles.resultsComparison}>
          <div className={styles.resultsComparisonTitle}>
            Baseline vs. Perturbed Output Stability
          </div>
          <div className={styles.resultsComparisonGrid}>
            <div>
              <strong>Original Direct Output:</strong>
              <div>Status: {baselineResult?.direct?.status || 'N/A'}</div>
              <div>Prediction: {baselineResult?.direct?.prediction ?? 'null (STUB)'}</div>
              <div>Latency: {baselineResult?.direct?.latency_ms ?? '--'} ms</div>
            </div>
            <div>
              <strong>Perturbed Direct Output:</strong>
              <div>Status: {perturbedResult?.direct?.status || 'N/A'}</div>
              <div>Prediction: {perturbedResult?.direct?.prediction ?? 'null (STUB)'}</div>
              <div>Latency: {perturbedResult?.direct?.latency_ms ?? '--'} ms</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

