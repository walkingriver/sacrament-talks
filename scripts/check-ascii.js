#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'manuscript-lint.config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Missing config: ${path.relative(ROOT, CONFIG_PATH)}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const paths = config.paths || [];
  const extensions = new Set(config.extensions || ['.md']);

  if (paths.length === 0) {
    console.error('manuscript-lint.config.json must list at least one path.');
    process.exit(1);
  }

  return { paths, extensions };
}

function listFiles(dir, extensions, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      listFiles(fullPath, extensions, files);
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function describeChar(codePoint) {
  try {
    return require('util').format('%s', String.fromCodePoint(codePoint));
  } catch {
    return '?';
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  for (let offset = 0; offset < content.length; ) {
    const codePoint = content.codePointAt(offset);
    const char = String.fromCodePoint(codePoint);
    const charLength = codePoint > 0xffff ? 2 : 1;

    if (codePoint > 0x7f) {
      const before = content.slice(0, offset);
      const line = before.split('\n').length;
      const col = before.length - before.lastIndexOf('\n');

      issues.push({
        line,
        col,
        char,
        codePoint,
        hex: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        display: describeChar(codePoint),
      });
    }

    offset += charLength;
  }

  return issues;
}

function main() {
  const { paths, extensions } = loadConfig();
  const files = [];

  for (const relativePath of paths) {
    const absolutePath = path.join(ROOT, relativePath);
    const stat = fs.existsSync(absolutePath) ? fs.statSync(absolutePath) : null;

    if (!stat) {
      console.warn(`Warning: path not found, skipping: ${relativePath}`);
      continue;
    }

    if (stat.isDirectory()) {
      listFiles(absolutePath, extensions, files);
      continue;
    }

    if (stat.isFile() && extensions.has(path.extname(absolutePath))) {
      files.push(absolutePath);
    }
  }

  files.sort();

  let errorCount = 0;

  for (const filePath of files) {
    const issues = checkFile(filePath);
    if (issues.length === 0) {
      continue;
    }

    const relativePath = path.relative(ROOT, filePath);

    for (const issue of issues) {
      errorCount += 1;
      console.error(
        `${relativePath}:${issue.line}:${issue.col}  error  non-ASCII ${issue.hex} (${issue.display})`,
      );
    }
  }

  if (errorCount > 0) {
    console.error(`\nFound ${errorCount} non-ASCII character(s). Use plain ASCII only.`);
    process.exit(1);
  }

  console.log(`Checked ${files.length} file(s): all ASCII.`);
}

main();