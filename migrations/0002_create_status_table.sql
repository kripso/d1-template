-- Migration number: 0002 	 2025-12-14T13:46:14.415Z
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    is_up INTEGER NOT NULL DEFAULT 1,
    last_checked_at TEXT,
    status_changed_at TEXT,
    response_time_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert some sample services to monitor
INSERT INTO services (name, url, is_up, status_changed_at)
VALUES
    ('Google', 'https://www.google.com', 1, datetime('now')),
    ('GitHub', 'https://github.com', 1, datetime('now')),
    ('Cloudflare', 'https://www.cloudflare.com', 1, datetime('now'))
;
