// Command objdock is a self-hosted web client for S3-compatible object
// storage (Cloudflare R2, Amazon S3, Alibaba Cloud OSS, …).
//
// Configuration (environment variables):
//
//	OBJDOCK_DATA_DIR        directory for objdock.db (default ./data)
//	OBJDOCK_ADDR            listen address (default 127.0.0.1:8080)
//	OBJDOCK_ENCRYPTION_KEY  base64-encoded 32-byte key for credential encryption (required)
//	OBJDOCK_SECURE_COOKIES  set to 1 when served over HTTPS (default 0)
//
// Generate a key with:  objdock genkey
package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/pal537/objdock/internal/crypto"
	"github.com/pal537/objdock/internal/db"
	"github.com/pal537/objdock/internal/handlers"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "genkey" {
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			log.Fatal(err)
		}
		fmt.Println(base64.StdEncoding.EncodeToString(key))
		return
	}

	encKeyStr := os.Getenv("OBJDOCK_ENCRYPTION_KEY")
	if encKeyStr == "" {
		log.Fatal("OBJDOCK_ENCRYPTION_KEY is required (run: objdock genkey)")
	}
	encKey, err := crypto.KeyFromEnv(encKeyStr)
	if err != nil {
		log.Fatalf("bad encryption key: %v", err)
	}

	dataDir := os.Getenv("OBJDOCK_DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}
	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		log.Fatalf("cannot create data dir: %v", err)
	}

	database, err := db.Open(filepath.Join(dataDir, "objdock.db"))
	if err != nil {
		log.Fatalf("cannot open database: %v", err)
	}

	addr := os.Getenv("OBJDOCK_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}
	secure := os.Getenv("OBJDOCK_SECURE_COOKIES") == "1"

	handler := handlers.New(database, encKey, secure, staticFS(), serveIndex)
	log.Printf("ObjDock listening on %s (data: %s)", addr, dataDir)
	log.Fatal(http.ListenAndServe(addr, handler))
}
