# Full-stack calculator

A small, responsive calculator built with **React, TypeScript, and Go**. The browser validates input and sends a typed request to a REST API; all arithmetic is performed by the backend. Supports the four basic operations and all three optional operations from the Sezzle assignment.

## Features

- Addition, subtraction, multiplication, division, exponentiation, square root, and percentage.
- Responsive operation selector, contextual operand labels, keyboard-friendly form, accessible feedback, and clear/reset action.
- Client-side numeric validation; authoritative server-side validation of arity, types, mathematical domains, and finite results.
- Consistent JSON success and error responses; request size limit and server/client timeouts.
- Unit tests for the arithmetic engine, HTTP handlers, frontend input validation and API client, plus React interaction tests.
- Optional single-container deployment and GitHub Actions CI for tests, coverage, and the frontend build.

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 22.16 or later (Node 22 LTS is the tested major version), with npm.
- [Go](https://go.dev/dl/) 1.23 or later (a currently supported Go release is recommended).
- [Git](https://git-scm.com/) to publish the project.
- Optional: [Docker](https://docs.docker.com/get-docker/) for a containerized build.

No database, accounts, secrets, or environment files are required. On Windows, use PowerShell or the VS Code integrated terminal. Run the following commands from the repository root in two separate terminals.

**Terminal 1 — backend**

```sh
cd backend
go run ./cmd/server
```

The API listens at `http://localhost:8080`. The health endpoint is `http://localhost:8080/api/v1/health`.

**Terminal 2 — frontend**

```sh
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` requests to the Go service on port 8080, so the browser does not need cross-origin access. Keep both terminals running. Stop either process with Ctrl+C.

The source archive was prepared in an environment without access to the npm registry, so it does not contain a generated `package-lock.json`. Direct dependency versions are pinned. The first `npm install` generates the lockfile; commit it to Git. Subsequent installations should use `npm ci` for reproducibility. Do not commit `node_modules` or build output.

### Production build without Docker

From the repository root, build the frontend:

```sh
cd frontend
npm install
npm run build
cd ../backend
```

Then run the Go server with the generated frontend directory. PowerShell:

```powershell
$env:STATIC_DIR = '../frontend/dist'
go run ./cmd/server
```

For Bash or another POSIX-compatible shell:

```sh
STATIC_DIR=../frontend/dist go run ./cmd/server
```

Open `http://localhost:8080` for both UI and API. `PORT` optionally changes the Go listening port; the development proxy is configured for 8080. `STATIC_DIR` is optional and enables static frontend serving. Remove the PowerShell variable with `Remove-Item Env:STATIC_DIR` after stopping the process if you want to return to API-only mode.

### Docker (optional)

From the repository root, with Docker running:

```sh
docker build -t sezzle-calculator .
docker run --rm -p 8080:8080 --name sezzle-calculator sezzle-calculator
```

Visit `http://localhost:8080`. The multi-stage image compiles the frontend and backend, then serves both from a small non-root runtime image. Stop it with Ctrl+C or `docker stop sezzle-calculator` in another terminal. Stop the locally running Go service first to avoid a port conflict.

## REST API

Base URL: `http://localhost:8080`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Health check; returns `{"status":"ok"}` |
| POST | `/api/v1/calculate` | Evaluate a single operation |

The calculation endpoint accepts `Content-Type: application/json` and this request shape:

```json
{"operation":"add","operands":[12,8]}
```

Success (`200 OK`):

```json
{"result":20}
```

Example failure (`400 Bad Request`):

```json
{"error":{"code":"DIVISION_BY_ZERO","message":"Cannot divide by zero."}}
```

### Operation reference

| Operation ID | Operands | Example operands | Result |
| --- | --- | --- | ---: |
| `add` | a, b | `[12,8]` | 20 |
| `subtract` | a, b | `[3,8]` | -5 |
| `multiply` | a, b | `[-4,5]` | -20 |
| `divide` | dividend, divisor | `[7,2]` | 3.5 |
| `power` | base, exponent | `[2,10]` | 1024 |
| `sqrt` | number | `[81]` | 9 |
| `percentage` | percent, value | `[15,200]` | 30 |

PowerShell examples:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/calculate -ContentType 'application/json' -Body '{"operation":"add","operands":[12,8]}'
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/calculate -ContentType 'application/json' -Body '{"operation":"sqrt","operands":[81]}'
```

Bash/curl examples:

```sh
curl http://localhost:8080/api/v1/health
curl -i -X POST http://localhost:8080/api/v1/calculate -H 'Content-Type: application/json' -d '{"operation":"percentage","operands":[15,200]}'
curl -i -X POST http://localhost:8080/api/v1/calculate -H 'Content-Type: application/json' -d '{"operation":"divide","operands":[5,0]}'
```

Additional HTTP statuses: `404` for unknown routes, `405` for unsupported methods, `413` for request bodies over 4096 bytes, `415` for unsupported media types, and `500` for unexpected internal errors. The calculation API uses `400` for invalid JSON, invalid operands, unsupported operations, and mathematical domain/range errors. See [API details](docs/API.md) for the complete error contract.

## Testing and coverage

Run the following commands in the specified folders. Tests do not require either development server to be running.

**Backend (`backend/`):**

```sh
go test -v ./...
go vet ./...
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

Open `backend/coverage.html` in a browser for annotated statement coverage. The arithmetic package is tested in isolation, and the HTTP tests use `httptest` without opening a network port.

**Frontend (`frontend/`):**

```sh
npm install
npm test
npm run coverage
npm run build
```

- `npm run test:core` runs dependency-free TypeScript tests using Node's built-in test runner.
- `npm run test:ui` runs React interaction tests using Vitest, Testing Library and jsdom.
- `npm run coverage:core` reports validation and API client line, branch and function coverage.
- `npm run coverage:ui` measures coverage for the React interaction suite and writes `frontend/coverage/index.html` and `coverage-summary.json`.
- `npm run coverage` runs both coverage suites separately; percentages must not be averaged together.
- `npm run build` type-checks application code and builds static production assets.

For an optional real HTTP integration test, start the Go server and run `npm run test:live` from `frontend/`. It exercises all seven operations through the frontend API client and verifies server-side errors.

A CI workflow runs the backend and frontend checks and uploads coverage artifacts for each job. No external services or secrets are required.

### Included verification snapshot

See [coverage notes and reports](docs/coverage/README.md) for actual Go and dependency-free TypeScript results, and the explicit list of checks not run in the preparation environment. Run the React suite, production build, and browser checks locally before submitting. See [manual test checklist](docs/MANUAL_TESTS.md).

## Architecture and design decisions

```text
Browser (React + TypeScript)
  Form and operation selection
      -> Input validation
      -> API client (fetch)
                 | HTTP/JSON
                 v
Go HTTP service
  Router and request/response validation
      -> Pure arithmetic engine
      -> JSON response
                 |
                 v
Browser (result or actionable error)
```

- **React with TypeScript:** small component state, typed operation IDs and request contracts, no unnecessary global state or UI dependencies. The API client is separate from rendering and accepts an injectable fetch implementation for tests.
- **Go standard library:** `net/http`, `encoding/json`, and `math` are sufficient for this small stateless service. The calculation engine has no HTTP dependency, making it straightforward to unit-test and extend.
- **Single versioned endpoint:** all operations share one input and output shape, so adding operations does not require a new route per operation. A separate health endpoint supports manual verification and deployment checks.
- **Validation at two layers:** the UI catches invalid numeric text and missing inputs for immediate feedback. The server independently checks request structure and arithmetic errors; client validation cannot bypass it. The UI deliberately lets the server report mathematical domain errors such as division by zero.
- **Stateless and same-origin:** no persistence or authentication is needed for a public arithmetic demo. Vite's development proxy and Go's optional static hosting avoid broad CORS policies. The service is intended for local evaluation, not as a hardened public deployment.
- **Numeric assumptions:** Go `float64` and JavaScript `number` use IEEE 754 double precision; decimal arithmetic can exhibit rounding (e.g. `0.1 + 0.2` can be `0.30000000000000004`). Inputs use a decimal point, not a comma; scientific notation is supported. The app displays the returned number rather than silently rounding it. This is not a financial-grade decimal calculator. Overflow and non-real results are errors; floating-point underflow may round to zero. Negative zero is normalized. `0^0` is defined as `1` consistently with `math.Pow`. Percentage means `a% of b`, not percentage change.
- **Focused scope:** single-operation calculations, no expression parser, history, database, or accounts. The assignment emphasizes correctness and maintainability over extra features.

## Project layout

```text
.
├── .github/workflows/ci.yml
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/calculator/       # Arithmetic and unit tests
│   ├── internal/httpapi/          # REST handlers and HTTP tests
│   └── go.mod
├── frontend/
│   ├── src/                       # React UI, validation, API client, styles
│   ├── tests/                     # Node and React tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── API.md
│   ├── MANUAL_TESTS.md
│   └── coverage/                 # Verification snapshot
├── AI_PROMPTS.md
├── Dockerfile
└── README.md
```

## AI tooling disclosure

The assignment explicitly allows AI tooling. [AI_PROMPTS.md](AI_PROMPTS.md) records the user request and the scope of AI assistance. Review the implementation, run the outstanding checks, and append any additional prompts used during your own review or debugging before sharing the repository.
