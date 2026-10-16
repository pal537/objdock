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
			language TEXT NOT NULL DEFAULT 'zh-CN',
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
			public_domain TEXT NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)`,
		`CREATE TABLE IF NOT EXISTS shares (
			token TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			account_id INTEGER NOT NULL,
			bucket TEXT NOT NULL,
			key TEXT NOT NULL,
			expires_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS upload_link_files (
			token TEXT NOT NULL,
			key TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			PRIMARY KEY (token, key)
		)`,
		`CREATE TABLE IF NOT EXISTS share_items (
			token TEXT NOT NULL,
			key TEXT NOT NULL,
			name TEXT NOT NULL,
			size INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (token, key)
		)`,
		`CREATE TABLE IF NOT EXISTS upload_links (
			token TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			account_id INTEGER NOT NULL,
			bucket TEXT NOT NULL,
			prefix TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL DEFAULT '',
			password_hash TEXT NOT NULL DEFAULT '',
			max_uses INTEGER NOT NULL DEFAULT 0,
			use_count INTEGER NOT NULL DEFAULT 0,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL
		)`,
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
	if !d.hasColumn("accounts", "public_domain") {
		if _, err := d.Exec(`ALTER TABLE accounts ADD COLUMN public_domain TEXT NOT NULL DEFAULT ''`); err != nil {
			return fmt.Errorf("db migrate public_domain: %w", err)
		}
	}
	if !d.hasColumn("shares", "name") {
		if _, err := d.Exec(`ALTER TABLE shares ADD COLUMN name TEXT NOT NULL DEFAULT ''`); err != nil {
			return fmt.Errorf("db migrate shares.name: %w", err)
		}
	}
	if !d.hasColumn("shares", "password_hash") {
		if _, err := d.Exec(`ALTER TABLE shares ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`); err != nil {
			return fmt.Errorf("db migrate shares.password_hash: %w", err)
		}
	}
	if !d.hasColumn("shares", "max_views") {
		if _, err := d.Exec(`ALTER TABLE shares ADD COLUMN max_views INTEGER NOT NULL DEFAULT 0`); err != nil {
			return fmt.Errorf("db migrate shares.max_views: %w", err)
		}
	}
	if !d.hasColumn("users", "language") {
		if _, err := d.Exec(`ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'zh-CN'`); err != nil {
			return fmt.Errorf("db migrate users.language: %w", err)
		}
	}
	if !d.hasColumn("shares", "view_count") {
		if _, err := d.Exec(`ALTER TABLE shares ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0`); err != nil {
			return fmt.Errorf("db migrate shares.view_count: %w", err)
		}
	}
	if !d.hasColumn("shares", "created_at") {
		if _, err := d.Exec(`ALTER TABLE shares ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`); err != nil {
			return fmt.Errorf("db migrate shares.created_at: %w", err)
		}
	}
	if !d.hasColumn("upload_links", "name") {
		if _, err := d.Exec(`ALTER TABLE upload_links ADD COLUMN name TEXT NOT NULL DEFAULT ''`); err != nil {
			return fmt.Errorf("db migrate upload_links.name: %w", err)
		}
	}
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
	Language    string
	CreatedAt   time.Time
}

func (d *DB) CreateUser(username, hash, displayName string, admin bool, lang string) (int64, error) {
	adminInt := 0
	if admin {
		adminInt = 1
	}
	if lang == "" {
		lang = "zh-CN"
	}
	res, err := d.Exec(`INSERT INTO users(username, password_hash, display_name, is_admin, language)
		VALUES(?, ?, ?, ?, ?)`, username, hash, displayName, adminInt, lang)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (d *DB) UserByUsername(username string) (*User, error) {
	u := &User{}
	var adminInt int
	err := d.QueryRow(`SELECT id, username, password_hash, display_name, is_admin, language, created_at
		FROM users WHERE username=?`, username).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &adminInt, &u.Language, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsAdmin = adminInt == 1
	return u, nil
}

func (d *DB) UserByID(id int64) (*User, error) {
	u := &User{}
	var adminInt int
	err := d.QueryRow(`SELECT id, username, password_hash, display_name, is_admin, language, created_at
		FROM users WHERE id=?`, id).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &adminInt, &u.Language, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsAdmin = adminInt == 1
	return u, nil
}

func (d *DB) SetUserLanguage(id int64, lang string) error {
	_, err := d.Exec(`UPDATE users SET language=? WHERE id=?`, lang, id)
	return err
}

func (d *DB) UserCount() int {
	var n int
	_ = d.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n)
	return n
}

func (d *DB) AllUsers() ([]*User, error) {
	rows, err := d.Query(`SELECT id, username, password_hash, display_name, is_admin, created_at
		FROM users ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*User
	for rows.Next() {
		u := &User{}
		var adminInt int
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &adminInt, &u.CreatedAt); err != nil {
			return nil, err
		}
		u.IsAdmin = adminInt == 1
		out = append(out, u)
	}
	return out, rows.Err()
}

func (d *DB) DeleteUser(id int64) error {
	for _, tbl := range []string{"shares", "accounts", "sessions"} {
		if _, err := d.Exec(`DELETE FROM `+tbl+` WHERE user_id=?`, id); err != nil {
			return err
		}
	}
	_, err := d.Exec(`DELETE FROM users WHERE id=?`, id)
	return err
}

func (d *DB) ResetUserPassword(id int64, hash string) error {
	if _, err := d.Exec(`UPDATE users SET password_hash=? WHERE id=?`, hash, id); err != nil {
		return err
	}
	d.DeleteUserSessions(id)
	return nil
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
	PublicDomain string
	CreatedAt time.Time
}

func (d *DB) CreateAccount(a *Account) (int64, error) {
	res, err := d.Exec(`INSERT INTO accounts(user_id, name, provider, endpoint, region, access_key, secret_enc, bucket, quota_bytes, public_domain)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.UserID, a.Name, a.Provider, a.Endpoint, a.Region, a.AccessKey, a.SecretEnc, a.Bucket, a.QuotaBytes, a.PublicDomain)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (d *DB) AccountsByUser(userID int64) ([]*Account, error) {
	rows, err := d.Query(`SELECT id, user_id, name, provider, endpoint, region, access_key, secret_enc, bucket, created_at, quota_bytes, public_domain
		FROM accounts WHERE user_id=? ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Account
	for rows.Next() {
		a := &Account{}
		if err := rows.Scan(&a.ID, &a.UserID, &a.Name, &a.Provider, &a.Endpoint,
			&a.Region, &a.AccessKey, &a.SecretEnc, &a.Bucket, &a.CreatedAt, &a.QuotaBytes, &a.PublicDomain); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (d *DB) AccountByID(id, userID int64) (*Account, error) {
	a := &Account{}
	err := d.QueryRow(`SELECT id, user_id, name, provider, endpoint, region, access_key, secret_enc, bucket, created_at, quota_bytes, public_domain
		FROM accounts WHERE id=? AND user_id=?`, id, userID).
		Scan(&a.ID, &a.UserID, &a.Name, &a.Provider, &a.Endpoint,
			&a.Region, &a.AccessKey, &a.SecretEnc, &a.Bucket, &a.CreatedAt, &a.QuotaBytes, &a.PublicDomain)
	if err != nil {
		return nil, err
	}
	return a, nil
}

// Share is a short public link to one object.
type Share struct {
	Token     string
	UserID    int64
	AccountID int64
	Bucket    string
	Key       string
	Name      string
	CreatedAt int64
	ExpiresAt int64
	PasswordHash string
	MaxViews  int64
	ViewCount int64
}

func (d *DB) CreateShare(sh *Share) error {
	_, err := d.Exec(`INSERT INTO shares(token, user_id, account_id, bucket, key, name, created_at, expires_at, password_hash, max_views, view_count)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, sh.Token, sh.UserID, sh.AccountID, sh.Bucket, sh.Key, sh.Name, sh.CreatedAt, sh.ExpiresAt, sh.PasswordHash, sh.MaxViews, sh.ViewCount)
	return err
}

func (d *DB) ShareByToken(token string) (*Share, error) {
	sh := &Share{}
	err := d.QueryRow(`SELECT token, user_id, account_id, bucket, key, name, created_at, expires_at, password_hash, max_views, view_count
		FROM shares WHERE token=?`, token).Scan(
		&sh.Token, &sh.UserID, &sh.AccountID, &sh.Bucket, &sh.Key, &sh.Name, &sh.CreatedAt, &sh.ExpiresAt, &sh.PasswordHash, &sh.MaxViews, &sh.ViewCount)
	if err != nil {
		return nil, err
	}
	return sh, nil
}

func (d *DB) SharesByUser(userID int64) ([]*Share, error) {
	rows, err := d.Query(`SELECT token, user_id, account_id, bucket, key, name, created_at, expires_at, password_hash, max_views, view_count
		FROM shares WHERE user_id=? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*Share
	for rows.Next() {
		sh := &Share{}
		if err := rows.Scan(&sh.Token, &sh.UserID, &sh.AccountID, &sh.Bucket, &sh.Key,
			&sh.Name, &sh.CreatedAt, &sh.ExpiresAt, &sh.PasswordHash, &sh.MaxViews, &sh.ViewCount); err != nil {
			return nil, err
		}
		out = append(out, sh)
	}
	return out, rows.Err()
}

func (d *DB) IncrementShareView(token string) error {
	_, err := d.Exec(`UPDATE shares SET view_count = view_count + 1 WHERE token=?`, token)
	return err
}

func (d *DB) DeleteShare(token string, userID int64) error {
	_, err := d.Exec(`DELETE FROM shares WHERE token=? AND user_id=?`, token, userID)
	return err
}

// UploadLink is a public link that lets anyone upload files to a prefix.
type UploadLink struct {
	Token        string
	UserID       int64
	AccountID    int64
	Bucket       string
	Prefix       string
	Name         string
	PasswordHash string
	MaxUses      int64
	UseCount     int64
	ExpiresAt    int64
	CreatedAt    int64
}

func (d *DB) CreateUploadLink(ul *UploadLink) error {
	_, err := d.Exec(`INSERT INTO upload_links(token, user_id, account_id, bucket, prefix, name, password_hash, max_uses, use_count, expires_at, created_at)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ul.Token, ul.UserID, ul.AccountID, ul.Bucket, ul.Prefix, ul.Name, ul.PasswordHash, ul.MaxUses, ul.UseCount, ul.ExpiresAt, ul.CreatedAt)
	return err
}

func (d *DB) UploadLinkByToken(token string) (*UploadLink, error) {
	ul := &UploadLink{}
	err := d.QueryRow(`SELECT token, user_id, account_id, bucket, prefix, name, password_hash, max_uses, use_count, expires_at, created_at
		FROM upload_links WHERE token=?`, token).Scan(
		&ul.Token, &ul.UserID, &ul.AccountID, &ul.Bucket, &ul.Prefix, &ul.Name, &ul.PasswordHash, &ul.MaxUses, &ul.UseCount, &ul.ExpiresAt, &ul.CreatedAt)
	if err != nil {
		return nil, err
	}
	return ul, nil
}

func (d *DB) UploadLinksByUser(userID int64) ([]*UploadLink, error) {
	rows, err := d.Query(`SELECT token, user_id, account_id, bucket, prefix, name, password_hash, max_uses, use_count, expires_at, created_at
		FROM upload_links WHERE user_id=? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*UploadLink
	for rows.Next() {
		ul := &UploadLink{}
		if err := rows.Scan(&ul.Token, &ul.UserID, &ul.AccountID, &ul.Bucket, &ul.Prefix, &ul.Name,
			&ul.PasswordHash, &ul.MaxUses, &ul.UseCount, &ul.ExpiresAt, &ul.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, ul)
	}
	return out, rows.Err()
}

func (d *DB) UpdateUploadLink(token string, userID int64, name, prefix string, expiresAt int64) error {
	_, err := d.Exec(`UPDATE upload_links SET name=?, prefix=?, expires_at=? WHERE token=<redacted> AND user_id=?`,
		name, prefix, expiresAt, token, userID)
	return err
}

func (d *DB) RecordUploadLinkFile(token, key string) error {
	_, err := d.Exec(`INSERT OR IGNORE INTO upload_link_files(token, key, created_at) VALUES(?, ?, ?)`,
		token, key, time.Now().Unix())
	return err
}

// DeleteUploadLinkFilesByKeys 删除指定 key 在 upload_link_files 中的记录（文件被删时同步清理）
func (d *DB) DeleteUploadLinkFilesByKeys(keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	q := `DELETE FROM upload_link_files WHERE key IN (`
	args := make([]any, len(keys))
	for i, k := range keys {
		if i > 0 {
			q += ","
		}
		q += "?"
		args[i] = k
	}
	q += ")"
	_, err := d.Exec(q, args...)
	return err
}

func (d *DB) UploadLinkFiles(token string) ([]string, error) {
	rows, err := d.Query(`SELECT key FROM upload_link_files WHERE token=? ORDER BY created_at DESC`, token)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

func (d *DB) DeleteUploadLink(token string, userID int64) error {
	_, err := d.Exec(`DELETE FROM upload_links WHERE token=? AND user_id=?`, token, userID)
	return err
}

func (d *DB) IncrementUploadUse(token string) error {
	_, err := d.Exec(`UPDATE upload_links SET use_count = use_count + 1 WHERE token=?`, token)
	return err
}

func (d *DB) AddShareItem(token, key, name string, size int64) error {
	_, err := d.Exec(`INSERT OR REPLACE INTO share_items(token, key, name, size) VALUES(?, ?, ?, ?)`,
		token, key, name, size)
	return err
}

func (d *DB) ShareItems(token string) ([]map[string]any, error) {
	rows, err := d.Query(`SELECT key, name, size FROM share_items WHERE token=? ORDER BY name`, token)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var key, name string
		var size int64
		if err := rows.Scan(&key, &name, &size); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"key": key, "name": name, "size": size})
	}
	return out, rows.Err()
}

func (d *DB) PruneExpiredShares() {
	d.Exec(`DELETE FROM shares WHERE expires_at < strftime('%s','now')`)
}

func (d *DB) UpdateAccount(a *Account) error {
	_, err := d.Exec(`UPDATE accounts SET name=?, provider=?, endpoint=?, region=?,
		access_key=?, secret_enc=?, bucket=?, quota_bytes=?, public_domain=? WHERE id=? AND user_id=?`,
		a.Name, a.Provider, a.Endpoint, a.Region, a.AccessKey, a.SecretEnc,
		a.Bucket, a.QuotaBytes, a.PublicDomain, a.ID, a.UserID)
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
