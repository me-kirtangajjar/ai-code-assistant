# AI-Powered Intelligent Code Error Analysis and Automated Feedback System

An MCA major project that helps programming students run Python code and understand syntax and runtime errors. Python remains the source of truth for error detection; a configurable AI provider only explains errors Python has already reported.

## Features

- **Authentication:** Secure email/password registration and login with Bearer JWT persistence.
- **Python Execution:** Monaco-based editor integrated with a secure, Docker-isolated Python 3.13 sandbox.
- **AI Explanation:** Automated explanations for Python errors using a configurable AI provider (Gemini or Mock).
- **Execution History:** Authenticated, ownership-scoped submission history with newest-first pagination.
- **Profile:** Read-only profile information displaying total, successful, and failed run statistics.
- **Responsive UI:** Modern, accessible interface with structured error handling.
- **Security:** Strict API-envelope parsing, centralized request validation, structured logging, and defensive headers.

## Architecture

```text
Next.js frontend (authentication, dashboard, history, profile)
       ↓ bearer token
Express REST API → authentication modules → MongoDB through Mongoose
       ↓ validated Python source
Docker-isolated Python runner
       ↓ only when status is python_error
AIProvider (mock or Gemini) → MongoDB submission → frontend result
```

The backend validates configuration and connects to MongoDB before accepting traffic. It closes its database connection gracefully during shutdown. Every API response receives defensive security headers and an `X-Request-Id`. Structured request logs contain safe metadata and exclude sensitive data. Production Compose runs these boundaries on a private network; the trusted backend alone receives access to the Docker daemon used to create isolated execution containers.

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, Monaco Editor
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose
- **Authentication:** bcrypt, JWT bearer tokens
- **Validation:** Zod
- **Package management:** pnpm workspaces
- **Execution environment:** Docker and Python 3.13
- **Code quality:** ESLint, Prettier, EditorConfig

## Folder Structure

```text
ai-code-error-feedback-system/
├── frontend/
│   └── src/
│       ├── app/                   # Auth, dashboard, history/detail, profile, and redirects
│       ├── components/            # Layout, forms, editor, history, result, and UI primitives
│       ├── context/               # Bearer-token authentication state
│       ├── hooks/                 # Auth, execution, history, detail, and profile orchestration
│       ├── lib/                   # API client, storage, validation, and AI parsing
│       ├── services/              # Authentication, analysis, history, and profile API calls
│       └── types/                 # Typed frontend/API contracts
├── backend/
│   └── src/
│       ├── common/              # Shared API errors and response helpers
│       ├── config/              # Validated environment configuration
│       ├── database/            # MongoDB lifecycle and Mongoose models
│       ├── middleware/          # Validation, authentication, and error handling
│       ├── modules/auth/        # Register, login, JWT, and current-user flow
│       ├── modules/analysis/    # Execution, optional explanation, and persistence
│       ├── modules/ai/          # Vendor-neutral explanation providers
│       ├── modules/health/      # Public health endpoint
│       ├── python-runner/       # Docker lifecycle, limits, capture, and cleanup
│       ├── app.ts               # Express application composition
│       └── server.ts            # Startup and graceful shutdown
├── docker/                      # Production images, startup gate, Compose, and env template
└── docs/                        # Architecture and system design documentation
```

## Installation

### Prerequisites

- Node.js 22+
- pnpm 11+
- MongoDB instance
- Docker Desktop or Docker Engine (backend needs daemon access)
- Git

### Local development

From the repository root:

```bash
corepack enable
pnpm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Build the approved local Python runner image before using the analysis endpoint:

```bash
docker build --file docker/Dockerfile.python \
  --tag ai-code-error-feedback-python-runner:1.0.0 docker
```

## Environment Variables

### Backend (`backend/.env`)
- `NODE_ENV`: Application environment (development/production)
- `PORT`: Backend server port (e.g., 4000)
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: Secret for signing tokens
- `JWT_EXPIRES_IN`: Token lifespan (e.g., 7d)
- `PYTHON_RUNNER_IMAGE`: Docker image tag to use
- `EXECUTION_*`: Execution limits (timeout, memory, CPU, outputs, concurrency)
- `AI_PROVIDER`: Which AI implementation to load (mock/gemini)
- `GEMINI_API_KEY`: Secret API key for Gemini

### Frontend (`frontend/.env.local`)
- `BACKEND_API_URL`: Server-side backend origin used by the Next.js API rewrite.

## Running Locally

Start the backend and frontend in separate terminals:

```bash
pnpm dev:backend
pnpm dev:frontend
```

Open `http://localhost:3000`. 

## Docker Production

Install Docker Engine and Docker Compose v2:

```bash
sudo install -d -o 10001 -g 10001 -m 700 /opt/ai-code-error-feedback/runner-workspaces
cp docker/.env.production.example docker/.env.production
```

Replace `change-me` values, set `DOCKER_GID` (`stat -c '%g' /var/run/docker.sock`), and validate/deploy:

```bash
docker compose --env-file docker/.env.production --file docker/docker-compose.yml config --quiet
docker compose --env-file docker/.env.production --file docker/docker-compose.yml \
  --profile build build python-runner-image backend frontend
docker compose --env-file docker/.env.production --file docker/docker-compose.yml \
  up --detach mongodb backend frontend
```

Verify health:
```bash
curl --fail http://127.0.0.1:4000/api/v1/health
curl --fail http://127.0.0.1:3000/api/v1/health
```

## Future Scope

Version 1 is feature-complete and production-packaged for the MCA project scope. Any later work—such as CI/CD, managed secrets, observability, rate limiting, or provider expansion—requires explicit scope approval and must preserve Python as the sole error-detection authority.

## License

This project is available under the [MIT License](LICENSE).
