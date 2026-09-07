#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'manuscript-lint.config.json');

const REPLACEMENTS = [
  ['\u2018', "'"],
  ['\u2019', "'"],
  ['\u201c', '"'],
  ['\u201d', '"'],
  ['\u2026', '...'],
  ['\u00b7', '|'],
];

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return {
    paths: config.paths || [],
    extensions: new Set(config.extensions || ['.md']),
  };
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

function normalizeEmDashes(text) {
  return text
    .replace(/\. — /g, '. - ')
    .replace(/ — /g, ', ')
    .replace(/—"/g, '..."')
    .replace(/—'/g, "...'")
    .replace(/—([a-zA-Z])/g, ', $1');
}

function normalizeContent(content, filePath) {
  let next = content;

  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }

  next = normalizeEmDashes(next);

  if (path.basename(filePath) === '00-copyright.md') {
    next = next.replace(/\u00a9/g, '&copy;').replace(/Copyright \(c\)/g, 'Copyright &copy;');
  }

  return next;
}

function main() {
  const { paths, extensions } = loadConfig();
  const files = [];

  for (const relativePath of paths) {
    listFiles(path.join(ROOT, relativePath), extensions, files);
  }

  files.sort();

  let changed = 0;

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, 'utf8');
    const normalized = normalizeContent(original, filePath);

    if (normalized !== original) {
      fs.writeFileSync(filePath, normalized);
      changed += 1;
      console.log(`normalized ${path.relative(ROOT, filePath)}`);
    }
  }

  console.log(`Done. Updated ${changed} file(s).`);
}

main();