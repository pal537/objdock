package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/pal537/objdock/internal/crypto"
	"github.com/pal537/objdock/internal/db"
)

// decryptSecret decrypts an account's stored secret key.
func decryptSecret(encKey []byte, secretEnc string) (string, error) {
	plain, err := crypto.Decrypt(encKey, secretEnc)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// accountJSON is the safe public view of an account (no secrets).
func accountJSON(a *db.Account) map[string]any {
	return map[string]any{
		"id":        a.ID,
		"name":      a.Name,
		"provider":  a.Provider,
		"endpoint":  a.Endpoint,
		"region":    a.Region,
		"accessKey": a.AccessKey,
		"bucket":    a.Bucket,
		"createdAt": a.CreatedAt.Format(time.RFC3339),
	}
}

// providerEndpoint returns the default endpoint template for a provider.
// Empty string means the user must enter it manually (custom).
func providerEndpoint(provider, accountID, region string) string {
	switch provider {
	case "r2":
		if accountID != "" {
			return "https://" + accountID + ".r2.cloudflarestorage.com"
		}
		return "https://<account-id>.r2.cloudflarestorage.com"
	case "s3":
		return "https://s3.amazonaws.com"
	case "oss":
		if region != "" {
			return "https://" + region + ".aliyuncs.com"
		}
		return "https://oss-cn-hangzhou.aliyuncs.com"
	case "cos":
		if region != "" {
			return "https://cos." + region + ".myqcloud.com"
		}
		return "https://cos.ap-guangzhou.myqcloud.com"
	case "qiniu":
		if region != "" {
			return "https://s3-" + region + ".qiniucs.com"
		}
		return "https://s3-cn-east-1.qiniucs.com"
	}
	return ""
}

// GET /api/accounts
func (s *Server) handleListAccounts(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	accounts, err := s.DB.AccountsByUser(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot list accounts")
		return
	}
	out := make([]map[string]any, 0, len(accounts))
	for _, a := range accounts {
		out = append(out, accountJSON(a))
	}
	writeJSON(w, http.StatusOK, map[string]any{"accounts": out})
}

type accountInput struct {
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	Endpoint  string `json:"endpoint"`
	Region    string `json:"region"`
	AccountID string `json:"accountId"` // provider-specific helper (e.g. R2 account id)
	AccessKey string `json:"accessKey"`
	SecretKey string `json:"secretKey"`
	Bucket    string `json:"bucket"`
}

func (s *Server) buildAccount(u *db.User, in accountInput, existing *db.Account) (*db.Account, string) {
	a := &db.Account{UserID: u.ID}
	if existing != nil {
		*a = *existing
	}
	a.Name = strings.TrimSpace(in.Name)
	a.Provider = strings.TrimSpace(in.Provider)
	if a.Provider == "" {
		a.Provider = "custom"
	}
	a.Region = strings.TrimSpace(in.Region)
	a.Endpoint = strings.TrimSpace(in.Endpoint)
	if a.Endpoint == "" {
		a.Endpoint = providerEndpoint(a.Provider, strings.TrimSpace(in.AccountID), a.Region)
	}
	a.Endpoint = strings.TrimSuffix(a.Endpoint, "/")
	a.AccessKey = strings.TrimSpace(in.AccessKey)
	a.Bucket = strings.TrimSpace(in.Bucket)
	if a.Name == "" {
		return nil, "name is required"
	}
	if a.Endpoint == "" || strings.Contains(a.Endpoint, "<") {
		return nil, "endpoint is required"
	}
	if a.AccessKey == "" {
		return nil, "access key is required"
	}
	if in.SecretKey != "" {
		enc, err := crypto.Encrypt(s.EncKey, []byte(in.SecretKey))
		if err != nil {
			return nil, "cannot encrypt secret"
		}
		a.SecretEnc = enc
	} else if existing == nil {
		return nil, "secret key is required"
	}
	return a, ""
}

// POST /api/accounts
func (s *Server) handleCreateAccount(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	var in accountInput
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	a, errMsg := s.buildAccount(u, in, nil)
	if errMsg != "" {
		writeErr(w, http.StatusBadRequest, errMsg)
		return
	}
	id, err := s.DB.CreateAccount(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot save account")
		return
	}
	a.ID = id
	writeJSON(w, http.StatusOK, map[string]any{"account": accountJSON(a)})
}

// PUT /api/accounts/{id} — secretKey optional (empty = keep existing).
func (s *Server) handleUpdateAccount(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	existing, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	var in accountInput
	if err := decodeJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	a, errMsg := s.buildAccount(u, in, existing)
	if errMsg != "" {
		writeErr(w, http.StatusBadRequest, errMsg)
		return
	}
	if err := s.DB.UpdateAccount(a); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot save account")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"account": accountJSON(a)})
}

// DELETE /api/accounts/{id}
func (s *Server) handleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err := s.DB.DeleteAccount(id, u.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot delete account")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// POST /api/accounts/{id}/test {bucket?} — verifies credentials.
// Tries ListBuckets; reports whether listing worked and which buckets were found.
func (s *Server) handleTestAccount(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	a := s.accountOrDraft(w, r, u)
	if a == nil {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	buckets, err := client.ListBuckets(ctx)
	if err != nil {
		// Listing failed — maybe a scoped key. Try the explicit bucket instead.
		if a.Bucket != "" {
			if herr := client.HeadBucket(ctx, a.Bucket); herr == nil {
				writeJSON(w, http.StatusOK, map[string]any{
					"ok":           true,
					"listable":     false,
					"buckets":      []string{a.Bucket},
					"note":         "key cannot list all buckets, but the specified bucket is reachable",
				})
				return
			}
		}
		writeErr(w, http.StatusBadGateway, "connection failed: "+friendlyS3Err(err))
		return
	}
	names := make([]string, 0, len(buckets))
	for _, b := range buckets {
		names = append(names, b.Name)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":       true,
		"listable": true,
		"buckets":  names,
	})
}

// accountOrDraft resolves the account for object APIs. It accepts either a
// saved account id or an inline draft (for the wizard's "test before save").
func (s *Server) accountOrDraft(w http.ResponseWriter, r *http.Request, u *db.User) *db.Account {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if id > 0 {
		a, err := s.DB.AccountByID(id, u.ID)
		if err != nil {
			writeErr(w, http.StatusNotFound, "account not found")
			return nil
		}
		return a
	}
	return nil
}

// GET /api/accounts/{id}/buckets
func (s *Server) handleListBuckets(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}
	buckets, err := client.ListBuckets(ctx)
	if err != nil {
		if a.Bucket != "" {
			writeJSON(w, http.StatusOK, map[string]any{"buckets": []map[string]any{{"name": a.Bucket}}, "listable": false})
			return
		}
		writeErr(w, http.StatusBadGateway, "cannot list buckets: "+friendlyS3Err(err))
		return
	}
	out := make([]map[string]any, 0, len(buckets))
	for _, b := range buckets {
		out = append(out, map[string]any{"name": b.Name, "creationDate": b.CreationDate})
	}
	writeJSON(w, http.StatusOK, map[string]any{"buckets": out, "listable": true})
}

// friendlyS3Err turns SDK errors into human-readable messages.
func friendlyS3Err(err error) string {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "InvalidAccessKeyId"),
		strings.Contains(msg, "SignatureDoesNotMatch"),
		strings.Contains(msg, "InvalidAccessKey"):
		return "invalid access key or secret"
	case strings.Contains(msg, "NoSuchBucket"):
		return "bucket does not exist"
	case strings.Contains(msg, "AccessDenied"):
		return "access denied — check key permissions"
	case strings.Contains(msg, "timeout"), strings.Contains(msg, "connection refused"),
		strings.Contains(msg, "no such host"), strings.Contains(msg, "dial"):
		return "cannot reach endpoint — check the address and network"
	}
	if len(msg) > 160 {
		msg = msg[:160]
	}
	return msg
}
