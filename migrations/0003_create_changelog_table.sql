-- Migration number: 0003 	 2026-01-01T00:00:00.000Z
CREATE TABLE IF NOT EXISTS changelog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    previous_status INTEGER NOT NULL,
    new_status INTEGER NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE INDEX IF NOT EXISTS idx_changelog_service_id ON changelog(service_id);
CREATE INDEX IF NOT EXISTS idx_changelog_changed_at ON changelog(changed_at);
