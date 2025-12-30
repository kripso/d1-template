#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = join(__dirname, '.svelte-kit', 'cloudflare', '_worker.js');
const utilsPath = join(__dirname, '.svelte-kit', 'output', 'server', 'chunks', 'utils2.js');

let workerContent = readFileSync(workerPath, 'utf-8');
const utilsContent = readFileSync(utilsPath, 'utf-8');

// Import performHealthChecks from utils
const importStatement = `import { p as performHealthChecks } from "../output/server/chunks/utils2.js";\n`;
workerContent = workerContent.replace(
	/(import.*?from "cloudflare:workers";)\n/,
	`$1\n${importStatement}`
);

// Add scheduled handler
const scheduledHandler = `
async function scheduled(event, env, ctx) {
	ctx.waitUntil(performHealthChecks(env));
}
`;

// Update export to include scheduled
workerContent = workerContent.replace(
	'export {\n  worker_default as default\n};',
	scheduledHandler + 'export {\n  worker_default as default,\n  scheduled\n};'
);

writeFileSync(workerPath, workerContent, 'utf-8');
console.log('✓ Added scheduled handler to worker');
