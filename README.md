# Team Task Tracker API

REST API for a team-based task tracker with JWT auth, role-based access control, enforced task status transitions, and Redis-cached task listings.

**Stack:** Node.js, Express, MongoDB (Mongoose), Redis Cloud.

## Setup

Requires Docker.

```bash
docker compose up --build
```

The API will be available at `http://localhost:5000`. MongoDB is hosted on Atlas and Redis on Redis Cloud — credentials are already in `.env`, so no extra setup is needed.

To run without Docker:

```bash
npm install
npm start
```

Health check:

```bash
curl http://localhost:5000/api/health
```

## API overview

| Method | Path | Auth | Role |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | — |
| POST | `/api/auth/login` | public | — |
| POST | `/api/auth/refresh` | public | — |
| POST | `/api/auth/logout` | public | — |
| POST | `/api/users` | bearer | ADMIN |
| GET | `/api/users` | bearer | ADMIN, MANAGER |
| POST | `/api/projects` | bearer | ADMIN, MANAGER |
| GET | `/api/projects` | bearer | any |
| POST | `/api/tasks` | bearer | ADMIN, MANAGER |
| GET | `/api/tasks` | bearer | any |
| GET | `/api/tasks/:id` | bearer | any |
| PATCH | `/api/tasks/:id` | bearer | ADMIN, MANAGER |
| PATCH | `/api/tasks/:id/status` | bearer | assignee or MANAGER/ADMIN |
| DELETE | `/api/tasks/:id` | bearer | ADMIN, MANAGER |

Full request/response shapes are documented in `openapi.yaml`.

### Try it

```bash
# Register creates a new organization and makes you its ADMIN
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@acme.test",
    "password": "password123",
    "name": "Alice Admin",
    "organizationName": "Acme Inc"
  }'

# Use the accessToken from the response as a Bearer token
curl http://localhost:5000/api/tasks \
  -H 'Authorization: Bearer <accessToken>'
```

## Authentication

Login and register return a short-lived access token (JWT, 15m) and an opaque refresh token (7d). Refresh tokens are stored as SHA-256 hashes in MongoDB, so a database leak never exposes a usable token. On every use the refresh token is rotated — the old one is marked revoked and a fresh pair is issued.

Public registration bootstraps a new organization and makes the registrant its ADMIN. Adding more users to an existing org is done by an admin through `POST /api/users`.

## Role-based access control

Three roles, enforced at the middleware layer (`src/middlewares/auth.js`):

| Role | Permissions |
| --- | --- |
| ADMIN | Manage users, projects, and tasks in the organization |
| MANAGER | Manage projects and tasks; cannot manage users |
| MEMBER | View and update only tasks assigned to them |

`authorize(...roles)` is a route-level middleware that gates coarse role permissions before a request reaches the controller. Two rules genuinely depend on the target record and live in the task service instead, because middleware can't know them without a database read:

- A MEMBER may only read tasks **assigned to them**.
- Only the **assignee or a MANAGER/ADMIN** may change a task's status.

Every query is **organization-scoped** using the `organizationId` from the JWT, never from request input. That is the core security guarantee — a user cannot read or mutate another organization's data even by guessing IDs.

## Task status transitions

Status is a server-enforced state machine, not a free-form field:

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
                 ↘        ↘
                  BLOCKED (from any active state)
```

- BLOCKED is reachable from any active state; from BLOCKED a task returns to IN_PROGRESS.
- IN_REVIEW can return to IN_PROGRESS (review rejected).
- DONE is terminal.

Invalid transitions return `409 INVALID_STATUS_TRANSITION`.

## Caching strategy and invalidation

Task listings are cached in Redis. The cache key is scoped per assignee plus the filter and pagination parameters:

```
tasks:{organizationId}:{assigneeId}:p{page}_l{limit}_s{status}_pr{priority}
```

- A listing is **only cached when it resolves to a single assignee**. For a MEMBER that is always themselves; for ADMIN/MANAGER it is whatever `assigneeId` filter they pass. Org-wide listings bypass the cache, so every cache entry maps cleanly to one person's view.
- Entries carry a **TTL** (default 60s) as a safety net.

**Invalidation is write-through eviction.** Any mutation that could change what an assignee's list returns — create, update, status change, delete — evicts all of that assignee's cached entries via the shared key prefix. Reassigning a task evicts both the old and new assignee's entries. This keeps reads consistent immediately after a write rather than waiting for the TTL.

Redis is treated as a non-critical dependency: any Redis error is swallowed and the request falls back to MongoDB, so a Redis outage degrades performance but never correctness.

### Note on the Redis connection

The original node-redis v2/v3 snippet (`redis.createClient(port, host, opts)` plus `client.auth(...)`) does not work with the `redis@^6` package this project uses. The same Redis Cloud host, port, and password are kept — only the API shape was updated to `createClient({ socket, password })` with an explicit `connect()`. See `src/config/redis.js`.

## Database design

```
Organization 1─* User
Organization 1─* Project
Project      1─* Task
User         1─* Task         (as assignee, nullable)
User         1─* RefreshToken
```

Indexes on the `Task` collection, exactly as the assignment requests:

```js
taskSchema.index({ status: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ dueDate: 1 });
```

### Design decision: `organizationId` denormalized onto Task

The most important data decision in this schema is that `Task` carries `organizationId` **directly** rather than reaching it through `Project`. Every task query in this system is organization-scoped — there is no code path that queries tasks across all organizations. If `organizationId` lived only on `Project`, every task query would need a join (a `Project.find` followed by `Task.find({ project: { $in: projectIds } })`), or a populated read. That is both slower and easier to get wrong: forget the join once and a user can see another organization's tasks.

Denormalizing `organizationId` onto `Task` makes org-scoping a single indexed equality (`{ organizationId, ... }`), which is the standard MongoDB approach for tenant isolation. The tradeoff is that moving a project between organizations would require updating its tasks too — but projects don't move between orgs in this domain, so the tradeoff is free.

## Error handling

All endpoints return a consistent error shape:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date"
}
```

Input is validated with `express-validator`. Validation failures, the application's own `AppError`s, and known Mongoose errors (validation, duplicate key, cast) are all mapped to this shape by a single error-handling middleware (`src/middlewares/errorHandler.js`).

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATUS_TRANSITION`, `INTERNAL_ERROR`.

## Project structure

```
src/
  config/         env, mongo connection, redis client
  models/         Mongoose schemas
  middlewares/    auth, validate, errorHandler
  services/       business logic and DB / cache access
  controllers/    request handlers
  routes/         express routers + validation rules
  app.js          mounts routes and error handler
  server.js       connects DB + Redis, starts the server
```

Layering rule: routes attach middleware and map to handlers, controllers parse the request and shape the response, services hold all business logic and database access. Controllers contain no role checks or business rules.

## What I would improve with more time

- **Tests.** The two flows most worth covering are the status-transition state machine (pure logic) and the RBAC boundary (a MEMBER must not read another user's task; a non-assignee must not advance status).
- **Proper invite flow** — replace admin-creates-user-with-password with an email-invite token the new user redeems to set their own password.
- **`SCAN`-based cache invalidation.** The current `redisClient.keys(prefix*)` is simple but blocks Redis on large keyspaces. The production-correct version uses `SCAN` or a Redis Set per assignee tracking that assignee's live cache keys.
- **Refresh token reuse detection.** If an already-revoked token is presented, revoke every active token for that user — a standard defense against stolen tokens.
- **Analytics endpoint** (overdue counts, average completion time).
- **Rate limiting** on auth endpoints and structured request logging.
- **Refresh token cleanup job** to purge expired/revoked tokens.

## Tradeoffs intentionally made

- Dev secrets (JWT, Redis Cloud credentials, MongoDB Atlas URI) are committed in `.env` so the reviewer gets a zero-config run. Real deployments would inject these via the environment.
- Projects are a thin module (create + list); the focus of the assignment is the task domain.
- Single-field indexes on `Task` per the assignment spec; in a real production system these would likely be compound indexes leading with `organizationId`.
