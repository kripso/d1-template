# Cloudflare Worker Status Page

A real-time service status monitoring application built with SvelteKit and deployed on Cloudflare Workers with D1 Database.

![Worker + D1 Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/cb7cb0a9-6102-4822-633c-b76b7bb25900/public)

## Features

- 🚀 Built with SvelteKit and Cloudflare Workers
- 💾 Uses Cloudflare D1 for serverless SQL database
- ⏰ Automated health checks via cron triggers (every minute)
- 📱 Telegram notifications for status changes
- 🎨 Beautiful dark-themed UI
- 📊 Real-time response time tracking

## Tech Stack

- **Framework**: SvelteKit
- **Deployment**: Cloudflare Workers with `@sveltejs/adapter-cloudflare`
- **Database**: Cloudflare D1 (serverless SQL)
- **Notifications**: Telegram Bot API
- **Styling**: Scoped CSS in Svelte components

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Cloudflare account with Workers and D1 enabled

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/):
   ```bash
   npx wrangler d1 create d1-template-database
   ```
   
3. Update the `database_id` field in `wrangler.json` with your new database ID.

4. Run the database migrations to initialize the database:
   ```bash
   npx wrangler d1 migrations apply --remote d1-template-database
   ```

5. (Optional) Set up Telegram notifications by adding secrets:
   ```bash
   npx wrangler secret put TELEGRAM_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```

### Development

#### Local Development with SvelteKit

Run the Vite development server:
```bash
npm run dev
```

Note: This runs the SvelteKit dev server without Workers runtime. For full Workers environment testing, use wrangler dev.

#### Local Development with Wrangler

First, seed the local database:
```bash
npm run seedLocalD1
```

Then run the local Cloudflare Workers environment:
```bash
npm run wrangler:dev
```

The application will be available at `http://localhost:8787`

### Building

Build the SvelteKit application for production:
```bash
npm run build
```

This will:
1. Build the SvelteKit app with Vite
2. Generate the Cloudflare Workers adapter output
3. Add the scheduled handler for cron triggers

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

This will:
1. Apply remote database migrations (if any)
2. Build and deploy to Cloudflare Workers

**Note:** Wrangler will automatically build the SvelteKit app when deploying. The build output (`.svelte-kit/` directory) is gitignored and generated on-demand.

## Project Structure

```
.
├── src/
│   ├── index.ts               # Main worker entry point (fetch + scheduled handlers)
│   ├── lib/
│   │   └── utils.ts           # Shared utilities and health check logic
│   ├── routes/
│   │   ├── +page.svelte       # Main status page component
│   │   └── +page.server.ts    # Server-side data loading
│   ├── app.d.ts               # TypeScript definitions
│   └── app.html               # HTML template
├── migrations/                # D1 database migrations
├── wrangler.json             # Cloudflare Workers configuration
├── svelte.config.js          # SvelteKit configuration
└── vite.config.ts            # Vite configuration
```

## Architecture

This project uses a clean architecture pattern:

- **`src/index.ts`**: Main worker entry point that handles both `fetch` and `scheduled` events
  - Fetch requests are routed to the SvelteKit app
  - Scheduled events trigger health checks via cron
- **SvelteKit**: Provides the frontend UI and server-side rendering
- **Cloudflare Workers**: Serverless execution environment
- **D1 Database**: Stores service status and history

## Configuration

### Database Schema

The application uses a `services` table to track monitored services:

```sql
CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    is_up INTEGER NOT NULL DEFAULT 1,
    last_checked_at TEXT,
    status_changed_at TEXT,
    response_time_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Adding Services to Monitor

Add services directly to the D1 database:

```bash
npx wrangler d1 execute DB --remote --command "INSERT INTO services (name, url) VALUES ('My Service', 'https://example.com/health')"
```

### Cron Schedule

The health checks run every minute by default. Modify the schedule in `wrangler.json`:

```json
{
  "triggers": {
    "crons": ["* * * * *"]  // Every minute
  }
}
```

**Note:** Running health checks every minute can be resource-intensive. For most use cases, running every 5 minutes (`*/5 * * * *`) may be more appropriate and cost-effective. Adjust based on your monitoring requirements.

## Environment Variables

- `TELEGRAM_TOKEN` (optional): Telegram Bot API token for notifications
- `TELEGRAM_CHAT_ID` (optional): Telegram chat ID for notifications

Set these as Cloudflare Workers secrets:
```bash
npx wrangler secret put TELEGRAM_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

## License

MIT
