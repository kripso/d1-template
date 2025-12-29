export interface ServiceStatus {
	id: number;
	name: string;
	url: string;
	is_up: number;
	last_checked_at: string | null;
	status_changed_at: string | null;
	response_time_ms: number | null;
	created_at: string;
}

// Parse D1 datetime string to Date object
// D1 stores dates via datetime('now') in UTC format (e.g., '2025-12-14 13:46:14')
export function parseD1DateTime(dateStr: string | null): Date | null {
	if (!dateStr) return null;
	// D1 datetime format is 'YYYY-MM-DD HH:MM:SS' in UTC
	// Append 'Z' to indicate UTC timezone for proper parsing
	return new Date(dateStr.replace(' ', 'T') + 'Z');
}

export function formatDuration(startDate: string | null): string {
	const start = parseD1DateTime(startDate);
	if (!start) return 'Unknown';
	const now = new Date();
	const diffMs = now.getTime() - start.getTime();
	
	const seconds = Math.floor(diffMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	
	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
}

export async function checkServiceHealth(url: string): Promise<{ isUp: boolean; responseTimeMs: number | null }> {
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
		
		// Cancel the response body to prevent deadlock as we only need status code
		response.body?.cancel();
		
		return { isUp, responseTimeMs };
	} catch {
		return { isUp: false, responseTimeMs: null };
	}
}

export async function sendToTelegram(msg: string, env: Env) {
	// Skip if Telegram credentials are not configured
	if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) {
		console.log('Telegram notification skipped (credentials not configured):', msg);
		return;
	}

	const form = new FormData();
	form.append("text", msg);
	form.append("chat_id", `${env.TELEGRAM_CHAT_ID}`);

	const init = {
		method: 'POST',
		headers: {
			"Authorization": `Bearer ${env.TELEGRAM_TOKEN}`
		},
		body: form
	};
	
	try {
		const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, init);
		// Cancel the response body to prevent deadlock as we don't need to read it
		response.body?.cancel();
	} catch (error) {
		console.error('Failed to send Telegram notification:', error);
	}
}

export async function performHealthChecks(env: Env): Promise<void> {
	const services = await env.DB.prepare("SELECT * FROM services").all<ServiceStatus>();
	
	for (const service of services.results) {
		const { isUp, responseTimeMs } = await checkServiceHealth(service.url);
		const wasUp = service.is_up === 1;
		const isFirstCheck = service.status_changed_at === null;
		const statusChanged = wasUp !== isUp;
		
		if (statusChanged || isFirstCheck) {
			await env.DB.prepare(
				"UPDATE services SET is_up = ?, last_checked_at = datetime('now'), status_changed_at = datetime('now'), response_time_ms = ? WHERE id = ?"
			).bind(isUp ? 1 : 0, responseTimeMs, service.id).run();

			const statusText = isUp ? 'UP' : 'DOWN';
			const message = `Service "${service.name}" is now ${statusText}.\nURL: ${service.url}`;
			await sendToTelegram(message, env);
		} else {
			await env.DB.prepare(
				"UPDATE services SET last_checked_at = datetime('now'), response_time_ms = ? WHERE id = ?"
			).bind(responseTimeMs, service.id).run();
		}
	}
}

export function lastUpdated(services: ServiceStatus[]): Date {
	return new Date(
		services
			.map(s => s.last_checked_at)
			.filter((d): d is string => d !== null)
			.sort()
			.reverse()[0] || new Date().toISOString()
	);
}
