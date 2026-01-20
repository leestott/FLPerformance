#!/usr/bin/env node

/**
 * Documentation Validation Script
 * Validates all markdown files for formatting, links, and consistency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const issues = [];
let filesChecked = 0;
let issuesFound = 0;

// Find all markdown files
function findMarkdownFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist') {
        findMarkdownFiles(fullPath, files);
      }
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Check for broken internal links
function checkInternalLinks(content, filePath) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...content.matchAll(linkRegex)];
  const fileDir = path.dirname(filePath);
  
  for (const match of matches) {
    const linkText = match[1];
    const linkTarget = match[2];
    
    // Skip external URLs
    if (linkTarget.startsWith('http://') || linkTarget.startsWith('https://')) {
      continue;
    }
    
    // Skip anchors only
    if (linkTarget.startsWith('#')) {
      continue;
    }
    
    // Check if file exists
    const targetPath = path.resolve(fileDir, linkTarget.split('#')[0]);
    if (!fs.existsSync(targetPath)) {
      issues.push({
        file: path.relative(rootDir, filePath),
        type: 'broken-link',
        message: `Broken link: "${linkText}" -> ${linkTarget}`,
        severity: 'error'
      });
      issuesFound++;
    }
  }
}

// Check for common formatting issues
function checkFormatting(content, filePath) {
  const lines = content.split('\n');
  const fileName = path.relative(rootDir, filePath);
  
  // Check for inconsistent heading levels
  let lastHeadingLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (level - lastHeadingLevel > 1) {
        issues.push({
          file: fileName,
          type: 'heading-skip',
          message: `Line ${i + 1}: Skipped heading level (from H${lastHeadingLevel} to H${level})`,
          severity: 'warning'
        });
      }
      lastHeadingLevel = level;
    }
  }
  
  // Check for triple backticks mismatch
  const backtickCount = (content.match(/```/g) || []).length;
  if (backtickCount % 2 !== 0) {
    issues.push({
      file: fileName,
      type: 'code-block',
      message: `Unmatched code blocks (found ${backtickCount} triple backticks)`,
      severity: 'error'
    });
    issuesFound++;
  }
  
  // Check for long lines (>120 chars, excluding code blocks and URLs)
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (!inCodeBlock && !line.includes('http') && line.length > 120) {
      issues.push({
        file: fileName,
        type: 'long-line',
        message: `Line ${i + 1}: Line too long (${line.length} chars)`,
        severity: 'info'
      });
    }
  }
}

// Check for inconsistent terminology
function checkTerminology(content, filePath) {
  const fileName = path.relative(rootDir, filePath);
  
  // Common mistakes
  const terminology = [
    { wrong: /foundry local(?!\-)/gi, correct: 'Foundry Local', name: 'Foundry Local capitalization' },
    { wrong: /foundrylocal(?!\-)/gi, correct: 'Foundry Local', name: 'Foundry Local spacing' },
    { wrong: /openAi/gi, correct: 'OpenAI', name: 'OpenAI capitalization' },
  ];
  
  for (const term of terminology) {
    if (term.wrong.test(content)) {
      issues.push({
        file: fileName,
        type: 'terminology',
        message: `Inconsistent terminology: "${term.name}" (use "${term.correct}")`,
        severity: 'warning'
      });
    }
  }
}

// Check README.md for corruption
function checkReadmeCorruption(content, filePath) {
  const fileName = path.relative(rootDir, filePath);
  
  if (!fileName.includes('README.md')) return;
  
  // Check for duplicate sections
  const sections = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('##')) {
      const section = line.trim();
      if (sections.includes(section)) {
        issues.push({
          file: fileName,
          type: 'duplicate-section',
          message: `Duplicate section: ${section}`,
          severity: 'error'
        });
        issuesFound++;
      }
      sections.push(section);
    }
  }
  
  // Check for incomplete lines (lines ending with lowercase letter followed by newline with capital)
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i].trim();
    const next = lines[i + 1].trim();
    
    if (current.length > 0 && 
        next.length > 0 &&
        !current.match(/[.!?:]$/) && 
        !current.startsWith('#') &&
        !current.startsWith('-') &&
        !current.startsWith('*') &&
        !current.startsWith('```') &&
        next.match(/^[A-Z-]/) &&
        !next.startsWith('##')) {
      issues.push({
        file: fileName,
        type: 'incomplete-line',
        message: `Line ${i + 1}: Possible incomplete line: "${current.substring(0, 50)}..."`,
        severity: 'warning'
      });
    }
  }
}

// Main validation function
function validateFile(filePath) {
  filesChecked++;
  const content = fs.readFileSync(filePath, 'utf-8');
  
  checkInternalLinks(content, filePath);
  checkFormatting(content, filePath);
  checkTerminology(content, filePath);
  checkReadmeCorruption(content, filePath);
}

// Print results
function printResults() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Documentation Validation Results${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);
  
  console.log(`Files checked: ${filesChecked}`);
  
  if (issues.length === 0) {
    console.log(`${colors.green}✅ No issues found!${colors.reset}\n`);
    return true;
  }
  
  // Group by severity
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');
  
  console.log(`${colors.red}Errors: ${errors.length}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${warnings.length}${colors.reset}`);
  console.log(`${colors.blue}Info: ${info.length}${colors.reset}\n`);
  
  // Print issues by file
  const fileGroups = {};
  for (const issue of issues) {
    if (!fileGroups[issue.file]) {
      fileGroups[issue.file] = [];
    }
    fileGroups[issue.file].push(issue);
  }
  
  for (const [file, fileIssues] of Object.entries(fileGroups)) {
    console.log(`${colors.cyan}${file}${colors.reset}`);
    for (const issue of fileIssues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      const color = issue.severity === 'error' ? colors.red : issue.severity === 'warning' ? colors.yellow : colors.blue;
      console.log(`  ${icon} ${color}[${issue.type}]${colors.reset} ${issue.message}`);
    }
    console.log('');
  }
  
  return errors.length === 0;
}

// Run validation
console.log(`${colors.cyan}Validating documentation...${colors.reset}\n`);

const markdownFiles = findMarkdownFiles(rootDir);
console.log(`Found ${markdownFiles.length} markdown files\n`);

for (const file of markdownFiles) {
  validateFile(file);
}

const success = printResults();
process.exit(success ? 0 : 1);
