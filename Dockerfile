FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY frontend/ ./
RUN npm run build

FROM golang:1.25-alpine AS backend-build
WORKDIR /app
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /calculator ./cmd/server

FROM scratch
COPY --from=backend-build /calculator /calculator
COPY --from=frontend-build /app/dist /web
ENV PORT=8080 STATIC_DIR=/web
EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["/calculator"]