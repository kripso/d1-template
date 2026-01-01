import { renderStatusPage, ServiceStatus } from "./renderHtml";

async function sendToTelegram(msg: string, env: Env) {
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
	const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, init);
	// Cancel the response body to prevent deadlock as we don't need to read it
	response.body?.cancel();
}

function wait(retryDelayMs: number) {
	return new Promise((resolve) => setTimeout(resolve, retryDelayMs));
}

function fetchRetry(url: string, retryDelayMs: number, tries: number, fetchOptions = {}): Promise<Response> {
    function onError(err: Error): Promise<Response> {
        const triesLeft = tries - 1;
        if(!triesLeft){
            throw err;
        }
        return wait(retryDelayMs).then(() => fetchRetry(url, retryDelayMs, triesLeft, fetchOptions));
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    return fetch(url, { ...fetchOptions, signal: controller.signal })
        .then((response) => {
            clearTimeout(timeoutId);
            return response;
        })
        .catch((err) => {
            clearTimeout(timeoutId);
            return onError(err);
        });
}

async function checkServiceHealth(url: string): Promise<boolean> {
    try {
        const response = await fetchRetry(url, 5000, 3, {
            method: 'GET',
            headers: {
                'User-Agent': 'StatusPage-HealthCheck/1.0'
            }
        });
        
        const isUp = response.status >= 200 && response.status < 400;
        response.body?.cancel();
        
        return isUp;
    } catch {
        return false;
    }
}

async function performHealthChecks(env: Env): Promise<void> {
	const services = await env.DB.prepare("SELECT * FROM services").all<ServiceStatus>();
	
	for (const service of services.results) {
		const isUp = await checkServiceHealth(service.url);
		const wasUp = service.is_up === 1;
		const isFirstCheck = service.status_changed_at === null;
		const statusChanged = wasUp !== isUp;
		
		if (statusChanged || isFirstCheck) {
			await env.DB.prepare(
				"UPDATE services SET is_up = ?, last_checked_at = datetime('now'), status_changed_at = datetime('now') WHERE id = ?"
			).bind(isUp ? 1 : 0, service.id).run();

			const statusText = isUp ? 'UP' : 'DOWN';
			const message = `Service "${service.name}" is now ${statusText}.\nURL: ${service.url}`;
			await sendToTelegram(message, env);
		} else {
			await env.DB.prepare(
				"UPDATE services SET last_checked_at = datetime('now') WHERE id = ?"
			).bind(service.id).run();
		}
	}
}

async function lastUpdated(services: ServiceStatus[]): Promise<Date> {
	return new Date(
		services
			.map(s => s.last_checked_at)
			.filter((d): d is string => d !== null)
			.sort()
			.reverse()[0] || new Date().toISOString()
	);
}

export default {
	async fetch(request, env) {
		// Main status page
		const stmt = env.DB.prepare("SELECT * FROM services ORDER BY name");
		const { results } = await stmt.all<ServiceStatus>();
		const lastUpdatedDate = await lastUpdated(results);

		return new Response(renderStatusPage(results, lastUpdatedDate), {
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
