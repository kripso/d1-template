# Cloudflare Worker Status Page with Svelte

A simple status page built with Cloudflare Workers, D1 Database, and Svelte frontend.

## Features

- Real-time health monitoring of services
- Automatic health checks every minute
- Telegram notifications on status changes
- Modern Svelte frontend with auto-refresh
- Cloudflare D1 for data persistence

## Getting Started

### Prerequisites

- Node.js and npm
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Setup Steps

1. Install the project dependencies:
   ```bash
   npm install
   ```

2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/):
   ```bash
   npx wrangler d1 create d1-template-database
   ```
   Update the `database_id` field in `wrangler.json` with the new database ID.

3. Run database migrations to initialize the database:
   ```bash
   npx wrangler d1 migrations apply --remote d1-template-database
   ```

4. Set up Telegram notifications (optional):
   - Create a Telegram bot via [@BotFather](https://t.me/botfather)
   - Get your chat ID
   - Add secrets to your worker:
     ```bash
     wrangler secret put TELEGRAM_TOKEN
     wrangler secret put TELEGRAM_CHAT_ID
     ```

5. Build the Svelte frontend:
   ```bash
   npm run build:frontend
   ```

6. Deploy the project:
   ```bash
   npm run deploy
   ```

## Development

### Local Development

1. Seed the local D1 database:
   ```bash
   npm run seedLocalD1
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Development

To work on the Svelte frontend with hot reload:
```bash
npm run dev:frontend
```

## Project Structure

- `src/index.ts` - Cloudflare Worker handler with health check logic
- `frontend/App.svelte` - Svelte frontend component
- `migrations/` - D1 database migration files
- `public/` - Built frontend assets (generated)

## Configuration

Edit `migrations/0002_create_status_table.sql` to add services you want to monitor.

## Scripts

- `npm run build:frontend` - Build Svelte frontend
- `npm run dev` - Start local development server
- `npm run dev:frontend` - Start Vite dev server for frontend
- `npm run deploy` - Deploy to Cloudflare
- `npm run check` - Type check and dry-run deployment
