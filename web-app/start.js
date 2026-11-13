#!/usr/bin/env node

/**
 * Universal server launcher for Ophthalmic Biomarker Prototype.
 * Allows running `npm start` from either root or web-app/ directory.
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locate backend directory
let backendDir = path.resolve(__dirname, 'backend');
if (!fs.existsSync(backendDir)) {
  backendDir = path.resolve(__dirname, 'web-app', 'backend');
}

if (!fs.existsSync(backendDir)) {
  console.error('❌ Could not locate backend directory at:', backendDir);
  process.exit(1);
}

// Locate uvicorn binary in venv or fallback to python3
let uvicornBin = path.join(backendDir, '.venv', 'bin', 'uvicorn');
let usePythonModule = false;

if (!fs.existsSync(uvicornBin)) {
  uvicornBin = 'python3';
  usePythonModule = true;
}

// Kill existing process on port 8000 if running
try {
  const pids = execSync('lsof -ti :8000', { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  if (pids.length > 0) {
    console.log(`🧹 Releasing port 8000 (killing previous instance PIDs: ${pids.join(', ')})...`);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch (e) {}
    }
  }
} catch (e) {
  // Port was not occupied
}

const args = usePythonModule
  ? ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload']
  : ['app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'];

console.log('\n=============================================================');
console.log('  👁️  OPHTHALMIC BIOMARKER RESEARCH PROTOTYPE');
console.log('=============================================================');
console.log('  🚀 Starting server on: http://127.0.0.1:8000');
console.log('  📂 Backend directory: ', backendDir);
console.log('  ⚡ Evaluator Testbed:  http://127.0.0.1:8000/upload.html');
console.log('  📋 Evaluator Dossier:  http://127.0.0.1:8000/evaluator.html');
console.log('=============================================================\n');

const env = {
  ...process.env,
  PYTHONPATH: backendDir,
  PYTHONUNBUFFERED: '1'
};

const server = spawn(uvicornBin, args, {
  cwd: backendDir,
  env,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

function cleanup() {
  if (server) {
    server.kill('SIGINT');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

