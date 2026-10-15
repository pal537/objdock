// Package db owns the SQLite schema and all persistence helpers.
//
// Tables:
//   users     - login accounts (argon2id password hash)
//   sessions  - server-side login sessions
//   settings  - key/value site settings (e.g. registration_enabled)
//   accounts  - S3-compatible storage accounts (secrets AES-GCM encrypted)
//   stats     - daily bucket stat snapshots for the growth trend chart
package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

// DB wraps sql.DB with ObjDock helpers.
type DB struct {
	*sql.DB
}

// Open opens (creating if needed) the SQLite database at path.
func Open(path string) (*DB, error) {
	sqlDB, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}
	d := &DB{sqlDB}
	if err := d.migrate(); err != nil {
		sqlDB.Close()
		return nil, err
	}
	return d, nil
}

func (d *DB) migrate() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			display_name TEXT NOT NULL DEFAULT '',
			is_admin INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
		`CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			provider TEXT NOT NULL DEFAULT 'custom',
			endpoint TEXT NOT NULL,
			region TEXT NOT NULL DEFAULT '',
			access_key TEXT NOT NULL,
			secret_enc TEXT NOT NULL,
			bucket TEXT NOT NULL DEFAULT '',
			quota_bytes INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)`,
		`CREATE TABLE IF NOT EXISTS stats (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
			bucket TEXT NOT NULL,
			day DATE NOT NULL,
			total_size INTEGER NOT NULL DEFAULT 0,
			file_count INTEGER NOT NULL DEFAULT 0,
			UNIQUE(account_id, bucket, day)
		)`,
	}
	for _, s := range stmts {
		if _, err := d.Exec(s); err != nil {
			return fmt.Errorf("db migrate: %w", err)
		}
	}
	// 已存在的 accounts 表补 quota_bytes 列
	if !d.hasColumn("accounts", "quota_bytes") {
		if _, err := d.Exec(`ALTER TABLE accounts ADD COLUMN quota_bytes INTEGER NOT NULL DEFAULT 0`); err != nil {
			return fmt.Errorf("db migrate quota_bytes: %w", err)
		}
	}
	// Defaults
	d.SetSetting("registration_enabled", "0")
	return nil
}

func (d *DB) hasColumn(table, col string) bool {
	rows, err := d.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			continue
		}
		if name == col {
			return true
		}
	}
	return false
}

// GetSetting reads a setting value, returning "" when missing.
func (d *DB) GetSetting(key string) string {
	var v string
	_ = d.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v)
	return v
}

// SetSetting upserts a setting, but never overwrites an existing value
// when called with the same default (used for first-run defaults).
func (d *DB) SetSetting(key, def string) {
	_, _ = d.Exec(`INSERT INTO settings(key, value) VALUES(?, ?)
		ON CONFLICT(key) DO NOTHING`, key, def)
}

// PutSetting unconditionally writes a setting.
func (d *DB) PutSetting(key, value string) error {
	_, err := d.Exec(`INSERT INTO settings(key, value) VALUES(?, ?)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value`, key, value)
	return err
}

// ---- users ----

// User is a login account. PasswordHash never leaves the auth package.
type User struct {
	ID          int64
	Username    string
	PasswordHash string
	DisplayName string
	IsAdmin     bool
	CreatedAt   time.Time
}

func (d *DB) CreateUser(username, hash, displayName string, admin bool) (int64, error) {
	adminInt := 0
	if admin {
		adminInt = 1
	}
	res, err := d.Exec(`INSERT INTO users(username, password_hash, display_name, is_admin)
		VALUES(?, ?, ?, ?)`, username, hash, displayName, adminInt)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (d *DB) UserByUsername(username string) (*User, error) {
	u := &User{}
	var adminInt int
	err := d.QueryRow(`SELECT id, username, password_hash, display_name, is_admin, created_at
		FROM users WHERE username=?`, username).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &adminInt, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsAdmin = adminInt == 1
	return u, nil
}

func (d *DB) UserByID(id int64) (*User, error) {
	u := &User{}
	var adminInt int
	err := d.QueryRow(`SELECT id, username, password_hash, display_name, is_admin, created_at
		FROM users WHERE id=?`, id).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &adminInt, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsAdmin = adminInt == 1
	return u, nil
}

func (d *DB) UserCount() int {
	var n int
	_ = d.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n)
	return n
}

func (d *DB) UpdateUser(id int64, displayName, hash string) error {
	if hash != "" {
		_, err := d.Exec(`UPDATE users SET display_name=?, password_hash=? WHERE id=?`,
			displayName, hash, id)
		return err
	}
	_, err := d.Exec(`UPDATE users SET display_name=? WHERE id=?`, displayName, id)
	return err
}

// ---- sessions ----

func (d *DB) CreateSession(id string, userID int64, ttl time.Duration) error {
	_, err := d.Exec(`INSERT INTO sessions(id, user_id, expires_at) VALUES(?, ?, ?)`,
		id, userID, time.Now().Add(ttl))
	return err
}

func (d *DB) SessionUser(sessionID string) (*User, error) {
	var userID int64
	err := d.QueryRow(`SELECT user_id FROM sessions WHERE id=? AND expires_at > CURRENT_TIMESTAMP`,
		sessionID).Scan(&userID)
	if err != nil {
		return nil, err
	}
	return d.UserByID(userID)
}

func (d *DB) DeleteSession(sessionID string) {
	_, _ = d.Exec(`DELETE FROM sessions WHERE id=?`, sessionID)
}

func (d *DB) DeleteUserSessions(userID int64) {
	_, _ = d.Exec(`DELETE FROM sessions WHERE user_id=?`, userID)
}

// PruneExpiredSessions removes stale sessions; safe to run periodically.
func (d *DB) PruneExpiredSessions() {
	_, _ = d.Exec(`DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP`)
}

// ---- accounts ----

// Account is an S3-compatible storage connection. SecretEnc holds the
// AES-GCM encrypted secret key; the plaintext secret never touches the DB.
type Account struct {
	ID        int64
	UserID    int64
	Name      string
	Provider  string
	Endpoint  string
	Region    string
	AccessKey string
	SecretEnc string
	Bucket    string
	QuotaBytes int64
	CreatedAt time.Time
}

func (d *DB) CreateAccount(a *Account) (int64, error) {
	res, err := d.Exec(`INSERT INTO accounts(user_id, name, provider, endpoint, region, access_key, secret_enc, bucket, quota_bytes)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.UserID, a.Name, a.Provider, a.Endpoint, a.Region, a.AccessKey, a.SecretEnc, a.Bucket, a.QuotaBytes)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (d *DB) AccountsByUser(userID int64) ([]*Account, error) {
	rows, err := d.Query(`SELECT id, user_id, name, provider, endpoint, region, access_key, secret_enc, bucket, created_at
		FROM accounts WHERE user_id=? ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Account
	for rows.Next() {
		a := &Account{}
		if err := rows.Scan(&a.ID, &a.UserID, &a.Name, &a.Provider, &a.Endpoint,
			&a.Region, &a.AccessKey, &a.SecretEnc, &a.Bucket, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (d *DB) AccountByID(id, userID int64) (*Account, error) {
	a := &Account{}
	err := d.QueryRow(`SELECT id, user_id, name, provider, endpoint, region, access_key, secret_enc, bucket, created_at
		FROM accounts WHERE id=? AND user_id=?`, id, userID).
		Scan(&a.ID, &a.UserID, &a.Name, &a.Provider, &a.Endpoint,
			&a.Region, &a.AccessKey, &a.SecretEnc, &a.Bucket, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (d *DB) UpdateAccount(a *Account) error {
	_, err := d.Exec(`UPDATE accounts SET name=?, provider=?, endpoint=?, region=?,
		access_key=?, secret_enc=?, bucket=?, quota_bytes=? WHERE id=? AND user_id=?`,
		a.Name, a.Provider, a.Endpoint, a.Region, a.AccessKey, a.SecretEnc,
		a.Bucket, a.QuotaBytes, a.ID, a.UserID)
	return err
}

func (d *DB) DeleteAccount(id, userID int64) error {
	_, err := d.Exec(`DELETE FROM accounts WHERE id=? AND user_id=?`, id, userID)
	return err
}

// ---- stats snapshots ----

// SaveStatSnapshot records today's totals for the growth trend chart.
func (d *DB) SaveStatSnapshot(accountID int64, bucket string, totalSize int64, fileCount int64) {
	_, _ = d.Exec(`INSERT INTO stats(account_id, bucket, day, total_size, file_count)
		VALUES(?, ?, date('now'), ?, ?)
		ON CONFLICT(account_id, bucket, day) DO UPDATE SET total_size=excluded.total_size, file_count=excluded.file_count`,
		accountID, bucket, totalSize, fileCount)
}

// StatHistory returns the last n days of snapshots, oldest first.
func (d *DB) StatHistory(accountID int64, bucket string, n int) ([]StatPoint, error) {
	rows, err := d.Query(`SELECT day, total_size, file_count FROM stats
		WHERE account_id=? AND bucket=? ORDER BY day DESC LIMIT ?`, accountID, bucket, n)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []StatPoint
	for rows.Next() {
		var p StatPoint
		if err := rows.Scan(&p.Day, &p.TotalSize, &p.FileCount); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	// reverse to oldest-first
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out, rows.Err()
}

// StatPoint is one daily snapshot.
type StatPoint struct {
	Day       string
	TotalSize int64
	FileCount int64
}
