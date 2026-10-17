package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// maxStatObjects caps how many objects the dashboard will scan.
// Beyond this the numbers are marked approximate.
const maxStatObjects = 100000

// GET /api/accounts/{id}/stats?bucket=
// Dashboard statistics: totals, by-folder bars, by-type donut,
// 12-month activity heatmap, and the stored growth trend.
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	u := s.currentUser(r)
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	a, err := s.DB.AccountByID(id, u.ID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "account not found")
		return
	}
	bucket := r.URL.Query().Get("bucket")
	if bucket == "" {
		bucket = a.Bucket
	}
	if bucket == "" {
		writeErr(w, http.StatusBadRequest, "bucket is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()
	client, err := s.s3Client(a)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "cannot decrypt secret")
		return
	}

	var (
		totalSize   int64
		fileCount   int64
		largestSize int64
		largestKey  string
		byFolder    = map[string]int64{}
		byType      = map[string]int64{}
		dayCounts   = map[string]int{}
		weekCount   int
		scanned     int64
		truncated   bool
	)
	weekAgo := time.Now().Add(-7 * 24 * time.Hour)
	token := ""
	for {
		page, err := client.ListAllPage(ctx, bucket, token)
		if err != nil {
			writeErr(w, http.StatusBadGateway, "stats failed: "+friendlyS3Err(err))
			return
		}
		for _, o := range page.Objects {
			if strings.HasSuffix(o.Key, "/") {
				continue // folder placeholder, not a file
			}
			scanned++
			if scanned > maxStatObjects {
				truncated = true
				break
			}
			totalSize += o.Size
			fileCount++
			if o.Size > largestSize {
				largestSize, largestKey = o.Size, o.Key
			}
			// Folder = top-level prefix.
			folder := o.Key
			if i := strings.Index(folder, "/"); i >= 0 {
				folder = folder[:i]
			} else {
				folder = "(root)"
			}
			byFolder[folder] += o.Size
			byType[typeLabel(fileKind(o.Key))] += o.Size
			if t, err := time.Parse(time.RFC3339, o.LastModified); err == nil {
				day := t.Format("2006-01-02")
				dayCounts[day]++
				if t.After(weekAgo) {
					weekCount++
				}
			}
		}
		if truncated || page.NextToken == "" {
			break
		}
		token = page.NextToken
	}

	// Persist today's snapshot for the growth trend (best effort).
	s.DB.SaveStatSnapshot(a.ID, bucket, totalSize, fileCount)
	history, _ := s.DB.StatHistory(a.ID, bucket, 90)

	writeJSON(w, http.StatusOK, map[string]any{
		"bucket":      bucket,
		"totalSize":   totalSize,
		"fileCount":   fileCount,
		"avgSize":     avg(totalSize, fileCount),
		"largest":     map[string]any{"key": largestKey, "size": largestSize},
		"weekCount":   weekCount,
		"byFolder":    topN(byFolder, 8),
		"byType":      topN(byType, 8),
		"activity":    dayCounts,
		"trend":       history,
		"truncated":   truncated,
		"scanned":     scanned,
	})
}

func avg(total, n int64) int64 {
	if n == 0 {
		return 0
	}
	return total / n
}

// typeLabel maps file kinds to stable keys; the frontend renders them per language.
func typeLabel(kind string) string {
	switch kind {
	case "image":
		return "image"
	case "video":
		return "video"
	case "audio":
		return "audio"
	case "pdf", "text", "office":
		return "doc"
	case "archive":
		return "archive"
	}
	return "other"
}

type kv struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

// topN returns the top n entries sorted by value desc.
func topN(m map[string]int64, n int) []kv {
	all := make([]kv, 0, len(m))
	for k, v := range m {
		all = append(all, kv{k, v})
	}
	// Simple insertion sort — n is tiny.
	for i := 1; i < len(all); i++ {
		for j := i; j > 0 && all[j].Value > all[j-1].Value; j-- {
			all[j], all[j-1] = all[j-1], all[j]
		}
	}
	if len(all) > n {
		all = all[:n]
	}
	return all
}
