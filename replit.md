# ResumeIQ

ResumeIQ analyzes a user's resume PDF against a target role with Gemini and delivers a validated report on screen and by email.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/resumeiq run dev` — run the ResumeIQ frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secret: `GEMINI_API_KEY`
- Required integration: authorized Gmail connector

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/resumeiq/src/pages/home.tsx` — upload form, processing state, and results dashboard
- `artifacts/api-server/src/lib/resume-analysis.ts` — PDF extraction, Gemini prompt/validation, and Gmail report delivery
- `artifacts/api-server/src/routes/resume.ts` — multipart upload validation and analysis endpoint
- `lib/api-spec/openapi.yaml` — API source of truth
- `README.md` — setup, testing, architecture, and troubleshooting

## Architecture decisions

- Resume bytes stay in memory for one request; the first version does not persist resume files or create a database record.
- PDF extraction runs server-side and falls back to inline PDF input for small scanned/image-based files when selectable text is unavailable.
- Gemini output is required to be JSON and is validated before it reaches the UI or email.
- Gmail delivery is best-effort after analysis; the website still returns the report if email sending fails.
- All third-party credentials remain server-side through Replit Secrets and the Gmail connector.

## Product

Users upload a resume PDF, choose one of the supported roles or a custom role, enter an email address, and receive overall/ATS scores plus strengths, gaps, keyword suggestions, improvements, and a final recommendation.

## User preferences

- Keep the first version functional and understandable without adding database complexity.

## Gotchas

- Regenerate API client/Zod output after changing the OpenAPI spec.
- The API server uses the Gmail connector; do not add credentials to frontend code or logs.
- PDF parsing must use the Node-safe `pdf-parse/lib/pdf-parse.js` entrypoint because the package root's debug harness is not safe to bundle.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
