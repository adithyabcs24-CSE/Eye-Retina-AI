# Future Work & Roadmap

## 1. Machine Learning & Model Checkpoint Integration
- **Trained Weight Integration**: Place verified PyTorch `.pt` / `.pth` model checkpoints into `web-app/checkpoints/` to transition the direct model from `STUB` to `LOADED`.
- **Grad-CAM Saliency Computation**: When weights are loaded, enable backward-gradient hook integration on the final convolutional layer of the anterior CNN encoder to generate high-resolution attention heatmaps over conjunctival and scleral microvasculature.
- **Empirical Calibration & Conformal Prediction**: When validation sets are evaluated, generate conformal prediction intervals (e.g. 95% coverage guarantees) and reliability diagrams for the metrics dashboard.

## 2. Computer Vision & Quality Gating Enhancements
- **Facial & Ocular Landmark Detector**: Replace the current `eye_visible` heuristic placeholder with a dedicated lightweight ONNX model (e.g. MediaPipe Face Mesh or pupil locator) running client-side or in-process.
- **Dynamic Glare Inpainting**: Investigate whether localized specular corneal glares can be infilled without distorting clinical biomarker signals.

## 3. Dataset Acquisition for Pathway B
- **Certified Paired Acquisition**: Pathway B will remain gated until a clinically verified dataset containing co-registered anterior eye photographs and bona fide mydriatic/non-mydriatic fundus images is established.
- **Counterfactual Hallucination Benchmarks**: Establish clinical safety benchmarks measuring false-positive lesion rates (hallucinated microaneurysms) in generative fundus reconstructions versus ground truth.

