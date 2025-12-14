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
function parseD1DateTime(dateStr: string | null): Date | null {
	if (!dateStr) return null;
	// D1 datetime format is 'YYYY-MM-DD HH:MM:SS' in UTC
	// Append 'Z' to indicate UTC timezone for proper parsing
	return new Date(dateStr.replace(' ', 'T') + 'Z');
}

function formatDuration(startDate: string | null): string {
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

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function renderStatusPage(services: ServiceStatus[]) {
	const allUp = services.every(s => s.is_up === 1);
	const overallStatus = allUp ? '✅ All Systems Operational' : '⚠️ Some Systems Down';
	const overallColor = allUp ? '#10b981' : '#f59e0b';
	
	const serviceRows = services.map(service => {
		const statusIcon = service.is_up ? '🟢' : '🔴';
		const statusText = service.is_up ? 'Up' : 'Down';
		const statusColor = service.is_up ? '#10b981' : '#ef4444';
		const duration = formatDuration(service.status_changed_at);
		const responseTime = service.response_time_ms ? `${service.response_time_ms}ms` : '-';
		const lastCheckedDate = parseD1DateTime(service.last_checked_at);
		const lastChecked = lastCheckedDate 
			? lastCheckedDate.toLocaleString()
			: 'Never';
		
		return `
			<div class="service-card" style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
				<div>
					<div style="font-size: 18px; font-weight: 600; color: #f1f5f9;">${statusIcon} ${escapeHtml(service.name)}</div>
					<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${escapeHtml(service.url)}</div>
				</div>
				<div style="text-align: right;">
					<div style="font-size: 14px; font-weight: 500; color: ${statusColor};">${statusText}</div>
					<div style="font-size: 12px; color: #94a3b8;">${service.is_up ? 'Up' : 'Down'} for ${duration}</div>
					<div style="font-size: 11px; color: #64748b;">Response: ${responseTime}</div>
				</div>
			</div>
		`;
	}).join('');

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="refresh" content="60">
	<title>Status Page</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: #0f172a;
			color: #f1f5f9;
			min-height: 100vh;
			padding: 40px 20px;
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
		}
		header {
			text-align: center;
			margin-bottom: 40px;
		}
		h1 {
			font-size: 28px;
			margin-bottom: 8px;
		}
		.overall-status {
			font-size: 20px;
			padding: 16px;
			border-radius: 8px;
			margin-bottom: 32px;
			text-align: center;
		}
		.last-updated {
			text-align: center;
			font-size: 12px;
			color: #64748b;
			margin-top: 24px;
		}
	</style>
</head>
<body>
	<div class="container">
		<header>
			<h1>📊 Service Status</h1>
			<p style="color: #94a3b8;">Real-time health monitoring</p>
		</header>
		<div class="overall-status" style="background: ${overallColor}20; border: 1px solid ${overallColor};">
			${overallStatus}
		</div>
		<div class="services">
			${serviceRows}
		</div>
		<div class="last-updated">
			Last updated: ${new Date().toLocaleString()}
		</div>
	</div>
</body>
</html>
`;
}
