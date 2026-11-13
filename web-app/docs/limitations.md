# Clinical, Technical & Section 15 Limitations

## 1. Non-Diagnostic Research Status
- **No Clinical Clearance**: This application is strictly an investigational software prototype. It has not received FDA clearance, CE mark certification, or SaMD regulatory validation.
- **Prohibited Terminology**: The system and documentation strictly refrain from diagnostic assertions (`"diagnose"`, `"confirmed disease"`, `"detects pathology"`).
- **No Treatment Guidance**: Point estimates must never be used to initiate, alter, or withhold medical treatment, insulin dosing, or clinical procedures.

## 2. Photographic Input Boundaries
- **External Eye Only**: The model is designed exclusively for anterior ocular photographs. Under no circumstances should users upload genuine retinal fundus photographs.
- **Lighting & Focus Vulnerabilities**: Anterior microvascular assessment depends on limbal and conjunctival resolution. Poor lighting, motion blur, or flash glare will degrade predictive signal, triggering the quality gate.
- **Anatomical Obstructions**: Squinting, ptosis, cataracts, or severe conjunctivitis can obscure corneal and vascular landmarks, impacting inference validity.

## 3. Generative Hallucination Risks (Pathway B)
- **Pixel Similarity vs Anatomical Validity**: L1 loss, PSNR, and SSIM metrics reflect surface pixel similarity but do **not** verify the clinical correctness or microvascular anatomy of generated fundus reconstructions.
- **Hallucinated Lesions**: Deep generative models (GANs, diffusion) risk hallucinating microaneurysms, cotton wool spots, or drusen that do not exist in the patient's real retina, creating severe patient safety hazards.
- **Gated Protocol**: Pathway B is strictly disabled (`pathway_b_available: false`) until rigorous clinical verification with paired anterior-fundus ground truth is established.

