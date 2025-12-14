import { renderStatusPage, ServiceStatus } from "./renderHtml";

async function checkServiceHealth(url: string): Promise<{ isUp: boolean; responseTimeMs: number | null }> {
	const startTime = Date.now();
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
		
		const response = await fetch(url, {
			method: 'GET',
			signal: controller.signal,
			headers: {
				'User-Agent': 'StatusPage-HealthCheck/1.0'
			}
		});
		
		clearTimeout(timeoutId);
		const responseTimeMs = Date.now() - startTime;
		
		// Consider 2xx and 3xx status codes as "up"
		// 3xx redirects indicate the server is responding, even if redirecting
		// This is intentional for status page monitoring as it shows reachability
		const isUp = response.status >= 200 && response.status < 400;
		return { isUp, responseTimeMs };
	} catch {
		return { isUp: false, responseTimeMs: null };
	}
}

async function performHealthChecks(env: Env): Promise<void> {
	const services = await env.DB.prepare("SELECT * FROM services").all<ServiceStatus>();
	
	for (const service of services.results) {
		const { isUp, responseTimeMs } = await checkServiceHealth(service.url);
		const wasUp = service.is_up === 1;
		const statusChanged = wasUp !== isUp;
		
		if (statusChanged) {
			await env.DB.prepare(
				"UPDATE services SET is_up = ?, last_checked_at = datetime('now'), status_changed_at = datetime('now'), response_time_ms = ? WHERE id = ?"
			).bind(isUp ? 1 : 0, responseTimeMs, service.id).run();
		} else {
			await env.DB.prepare(
				"UPDATE services SET last_checked_at = datetime('now'), response_time_ms = ? WHERE id = ?"
			).bind(responseTimeMs, service.id).run();
		}
	}
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		
		// Trigger manual healthcheck via /check endpoint
		if (url.pathname === '/check') {
			await performHealthChecks(env);
		}

		// Main status page
		const stmt = env.DB.prepare("SELECT * FROM services ORDER BY name");
		const { results } = await stmt.all<ServiceStatus>();

		return new Response(renderStatusPage(results), {
			headers: {
				"content-type": "text/html",
			},
		});
	},
	
	// Scheduled handler for periodic healthchecks
	async scheduled(event, env, ctx) {
		ctx.waitUntil(performHealthChecks(env));
	},
} satisfies ExportedHandler<Env>;
