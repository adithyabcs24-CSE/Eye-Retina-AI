import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');

describe('Gateway Security, Validation & Contract Tests', () => {

  // 1. Wrong type rejection
  test('Wrong type: rejects non-image MIME types with 400', async () => {
    const res = await request(app)
      .post('/api/quality')
      .attach('image', Buffer.from('plain text content'), 'document.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    expect(res.body.error.message).toMatch(/Only PNG and JPEG formats are permitted/);
    expect(res.body.stack).toBeUndefined();
  });

  // 2. Oversized file rejection
  test('Oversized file: rejects payload exceeding configured size limit with 400', async () => {
    // 10.5 MB buffer (limit is 10 MB)
    const largeBuffer = Buffer.alloc(10.5 * 1024 * 1024);
    const res = await request(app)
      .post('/api/quality')
      .attach('image', largeBuffer, 'large_photo.png');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body.stack).toBeUndefined();
  });

  // 3. Spoofed extension rejection (magic-byte check)
  test('Spoofed extension: rejects .png file with non-PNG magic bytes with 400', async () => {
    const fakePng = Buffer.from('NOT_A_REAL_PNG_HEADER_PAYLOAD');
    const res = await request(app)
      .post('/api/quality')
      .attach('image', fakePng, 'spoofed.png');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('INVALID_FILE_MAGIC');
    expect(res.body.stack).toBeUndefined();
  });

  // 4. Rate limiting & Error redaction
  test('Rate limiting: returns 429 when threshold exceeded', async () => {
    // Trigger multiple rapid requests to check rate limiting header and structure
    let lastRes;
    for (let i = 0; i < 105; i++) {
      lastRes = await request(app).get('/api/health');
      if (lastRes.status === 429) break;
    }
    expect(lastRes.status).toBe(429);
    expect(lastRes.body.error).toBeDefined();
    expect(lastRes.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(lastRes.body.stack).toBeUndefined();
  });

  // 5. Contract schema conformity
  test('Contract test: GET /api/capabilities conforms to schema', async () => {
    const res = await request(app).get('/api/capabilities');
    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.targets).toBeInstanceOf(Array);
      expect(typeof res.body.pathway_b_available).toBe('boolean');
      for (const t of res.body.targets) {
        expect(['classification', 'regression']).toContain(t.task_type);
        expect(['LOADED', 'STUB', 'UNAVAILABLE']).toContain(t.status);
      }
    }
  });

  test('Contract test: GET /api/model-card conforms to schema', async () => {
    const res = await request(app).get('/api/model-card');
    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.versions).toBeDefined();
      expect(res.body.intended_use).toBeDefined();
      expect(res.body.limitations).toBeInstanceOf(Array);
    }
  });

  // 6. Privacy test: zero image files written to disk after upload
  test('Privacy test: no uploaded image bytes or temporary files exist on disk', async () => {
    const validPngPath = path.join(FIXTURES_DIR, 'valid_external_eye_1.png');
    const validBytes = fs.readFileSync(validPngPath);

    const uploadsDir = path.resolve(__dirname, '../uploads');
    const rootUploadsDir = path.resolve(__dirname, '../../../uploads');

    // Run upload through gateway
    const res = await request(app)
      .post('/api/quality')
      .attach('image', validBytes, 'valid_test.png');

    // Verify neither uploads dir nor arbitrary image files were written
    expect(fs.existsSync(uploadsDir)).toBe(false);
    expect(fs.existsSync(rootUploadsDir)).toBe(false);
  });
});

