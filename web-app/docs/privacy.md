# Privacy, Data Governance & Ephemeral Processing Protocol

## 1. Regulatory Status & Intended Data Class
**WARNING: This prototype is strictly an investigational engineering workbench.**
- It is **NOT** approved, cleared, or certified for real patient health information (PHI) under HIPAA, GDPR Article 9, or clinical trial regulations.
- Under Section 15 research protocols, **no identifiable human subject data or protected clinical records** may be submitted to this system.
- All testing must use synthetic, phantom, or de-identified test photographs with appropriate institutional research approvals.

## 2. In-Memory Ephemeral Architecture
The application is architected from the ground up for strict transient processing:
1. **No Disk Persistence**:
   - Uploaded files are parsed via `python-multipart` strictly in RAM using `io.BytesIO`.
   - No temporary directories (e.g. `/tmp` or `uploads/`) are utilized during quality inspection or model inference.
   - Pillow decodes images directly from byte streams without writing intermediate files.
2. **Automated Memory Cleanup**:
   - Python byte buffers and NumPy tensor representations are unreferenced and collected immediately upon response delivery.
3. **Automated Test Verification**:
   - The test suite includes `test_privacy_no_disk_persistence` which actively audits the filesystem before and after inference to guarantee zero image artifacts are written to disk.

## 3. Privacy-Preserving Telemetry & Structured Logging
1. **Payload Redaction**:
   - Server access logs record only: timestamp, generated `X-Request-ID`, HTTP method, endpoint path, status code, and latency in milliseconds.
   - Raw binary bytes, image hashes, multipart form field values, and client filenames are strictly excluded from logging formatters.
2. **Researcher Observability**:
   - The `/api/researcher` portal aggregates numerical percentiles (p50, p90, p99) and request counters.
   - No client IP addresses, user cookies, or device fingerprints are stored in memory or exposed through the API.

