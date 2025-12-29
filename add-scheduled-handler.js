#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = join(__dirname, '.svelte-kit', 'cloudflare', '_worker.js');
const workerContent = readFileSync(workerPath, 'utf-8');

// Add scheduled handler before the export
const scheduledHandler = `
// Scheduled handler for cron triggers
async function performHealthChecks(env) {
	const services = await env.DB.prepare("SELECT * FROM services").all();
	
	for (const service of services.results) {
		const startTime = Date.now();
		let isUp = false;
		let responseTimeMs = null;
		
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);
			
			const response = await fetch(service.url, {
				method: 'GET',
				signal: controller.signal,
				headers: {
					'User-Agent': 'StatusPage-HealthCheck/1.0'
				}
			});
			
			clearTimeout(timeoutId);
			responseTimeMs = Date.now() - startTime;
			isUp = response.status >= 200 && response.status < 400;
			response.body?.cancel();
		} catch {
			isUp = false;
			responseTimeMs = null;
		}
		
		const wasUp = service.is_up === 1;
		const isFirstCheck = service.status_changed_at === null;
		const statusChanged = wasUp !== isUp;
		
		if (statusChanged || isFirstCheck) {
			await env.DB.prepare(
				"UPDATE services SET is_up = ?, last_checked_at = datetime('now'), status_changed_at = datetime('now'), response_time_ms = ? WHERE id = ?"
			).bind(isUp ? 1 : 0, responseTimeMs, service.id).run();

			const statusText = isUp ? 'UP' : 'DOWN';
			const message = \`Service "\${service.name}" is now \${statusText}.\\nURL: \${service.url}\`;
			
			// Send to Telegram if credentials are configured
			if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
				try {
					const form = new FormData();
					form.append("text", message);
					form.append("chat_id", \`\${env.TELEGRAM_CHAT_ID}\`);
					
					const telegramResponse = await fetch(\`https://api.telegram.org/bot\${env.TELEGRAM_TOKEN}/sendMessage\`, {
						method: 'POST',
						headers: {
							"Authorization": \`Bearer \${env.TELEGRAM_TOKEN}\`
						},
						body: form
					});
					telegramResponse.body?.cancel();
				} catch (error) {
					console.error('Failed to send Telegram notification:', error);
				}
			} else {
				console.log('Telegram notification skipped (credentials not configured):', message);
			}
		} else {
			await env.DB.prepare(
				"UPDATE services SET last_checked_at = datetime('now'), response_time_ms = ? WHERE id = ?"
			).bind(responseTimeMs, service.id).run();
		}
	}
}

const scheduled = async (event, env, ctx) => {
	ctx.waitUntil(performHealthChecks(env));
};
`;

// Replace the export to include scheduled handler
const modifiedContent = workerContent.replace(
	'export {\n  worker_default as default\n};',
	scheduledHandler + '\nexport {\n  worker_default as default,\n  scheduled\n};'
);

writeFileSync(workerPath, modifiedContent, 'utf-8');
console.log('✓ Added scheduled handler to worker');
