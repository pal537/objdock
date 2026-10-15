# ---- build ----
FROM golang:1.24-alpine AS builder
WORKDIR /src
# Pure-Go SQLite (modernc.org/sqlite): no CGO needed, cross-compiles cleanly.
ENV CGO_ENABLED=0
# Allow automatic toolchain upgrades (go.mod may require a newer Go).
ENV GOTOOLCHAIN=auto
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -trimpath -ldflags="-s -w" -o /objdock .

# ---- runtime ----
# Note: runs as root so it can write to the /data volume on any host.
FROM gcr.io/distroless/static-debian12
COPY --from=builder /objdock /objdock
# Frontend is embedded in the binary via go:embed; no extra files needed.
EXPOSE 8080
VOLUME ["/data"]
ENV OBJDOCK_DATA_DIR=/data
ENV OBJDOCK_ADDR=0.0.0.0:8080
ENTRYPOINT ["/objdock"]
