#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'manuscript-lint.config.json');

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const paths = config.paths || [];

  if (paths.length === 0) {
    console.error('manuscript-lint.config.json must list at least one path.');
    process.exit(1);
  }

  return paths;
}

const paths = loadConfig();
const valeBin = path.join(ROOT, 'node_modules', '.bin', 'vale');
const command = fs.existsSync(valeBin) ? valeBin : 'vale';

const result = spawnSync(command, ['--output=line', ...paths], {
  cwd: ROOT,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);