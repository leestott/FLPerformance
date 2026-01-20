#!/usr/bin/env node

/**
 * URL Validator for FLPerformance Documentation
 * Validates all URLs referenced in the project
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URLs to validate
const urls = [
  // Foundry Local Official
  'https://github.com/microsoft/foundry-local',
  'https://aka.ms/foundry-local-installer',
  'https://aka.ms/foundry-local-docs',
  'https://aka.ms/foundry-local-discord',
  'https://foundrylocal.ai',
  
  // Foundry Local GitHub Resources
  'https://github.com/microsoft/foundry-local/tree/main/sdk/js',
  'https://github.com/microsoft/foundry-local/tree/main/samples/js',
  'https://github.com/microsoft/foundry-local/blob/main/README.md',
  'https://github.com/microsoft/foundry-local/blob/main/sdk/js/README.md',
  
  // Microsoft Learn
  'https://learn.microsoft.com/azure/ai-foundry/foundry-local',
  'https://learn.microsoft.com/azure/ai-foundry/foundry-local/reference/reference-best-practice',
  
  // Package Registries
  'https://www.npmjs.com/package/foundry-local-sdk',
  'https://www.npmjs.com/package/openai',
  
  // Node.js
  'https://nodejs.org/',
  
  // GitHub Issues
  'https://github.com/microsoft/foundry-local/issues',
  'https://github.com/microsoft/foundry-local/releases'
];

console.log('🔍 Validating URLs in FLPerformance documentation...\n');

const results = {
  success: [],
  failed: [],
  redirected: []
};

function validateUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      method: 'HEAD',
      headers: {
        'User-Agent': 'FLPerformance-URL-Validator/1.0'
      }
    };
    
    const req = client.request(url, options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ url, status: res.statusCode, ok: true });
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        resolve({ url, status: res.statusCode, ok: true, redirected: res.headers.location });
      } else {
        resolve({ url, status: res.statusCode, ok: false });
      }
    });
    
    req.on('error', (error) => {
      resolve({ url, status: 'ERROR', ok: false, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT', ok: false, error: 'Request timeout' });
    });
    
    req.end();
  });
}

async function validateAllUrls() {
  console.log(`Checking ${urls.length} URLs...\n`);
  
  for (const url of urls) {
    process.stdout.write(`Checking: ${url} ... `);
    
    const result = await validateUrl(url);
    
    if (result.ok) {
      if (result.redirected) {
        console.log(`✓ (${result.status} → ${result.redirected})`);
        results.redirected.push(result);
      } else {
        console.log(`✓ (${result.status})`);
        results.success.push(result);
      }
    } else {
      console.log(`✗ (${result.status})`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      results.failed.push(result);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`🔄 Redirected: ${results.redirected.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('');
  
  if (results.redirected.length > 0) {
    console.log('Redirected URLs:');
    results.redirected.forEach(r => {
      console.log(`  ${r.url}`);
      console.log(`  → ${r.redirected}`);
    });
    console.log('');
  }
  
  if (results.failed.length > 0) {
    console.log('Failed URLs:');
    results.failed.forEach(r => {
      console.log(`  ❌ ${r.url} (${r.status})`);
      if (r.error) {
        console.log(`     ${r.error}`);
      }
    });
    console.log('');
    return 1;
  }
  
  console.log('✅ All URLs are valid!\n');
  return 0;
}

// Run validation
validateAllUrls()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
