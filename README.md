# ResumeIQ

ResumeIQ is a full-stack AI resume analyzer. A user uploads a PDF, chooses a target role (or asks for a general review), enters an email address, and receives a structured review on screen and by email.

## Project structure

```text
artifacts/
  api-server/
    src/lib/resume-analysis.ts   PDF extraction, Gemini analysis, Gmail delivery
    src/routes/resume.ts         Upload validation and API route
  resumeiq/
    src/pages/home.tsx           Upload flow and results dashboard
    src/components/              Brand, score, and result components
lib/
  api-spec/openapi.yaml          Source of truth for the API contract
  api-client-react/              Generated React Query hooks
  api-zod/                       Generated server validation schemas
```

## Dependencies

- React, TypeScript, Vite, Tailwind CSS
- Express 5 and Multer for the API and in-memory PDF uploads
- `pdf-parse` for multi-page text extraction
- Gemini 3.6 Flash through the Google Gemini REST API
- Replit Connectors SDK for authenticated Gmail delivery
- Orval for generated OpenAPI client hooks and Zod schemas

## Required configuration

### Gemini

Add this as a Replit Secret:

```text
GEMINI_API_KEY
```

Create the key in Google AI Studio. The key is read only by the API server. It is never placed in the browser bundle, logged, or returned in an API response.

### Gmail

ResumeIQ uses the Gmail connector to send the report from the connected Gmail account. Authorize Gmail for the project before testing email delivery. No Gmail password, OAuth token, or service-account credential belongs in the codebase.

## Run locally in Replit

The managed workflows start both services:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/resumeiq run dev
```

Useful checks:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
```

The frontend calls `/api/resume/analyze` through the shared Replit proxy. The API server listens on its workflow-provided port and mounts routes under `/api`.

## API flow

1. The browser validates the file extension/type, size, role, and email format.
2. The API accepts the PDF in memory with an 8 MB limit and does not persist the upload.
3. The server validates the PDF signature and extracts text with `pdf-parse`.
4. If there is no selectable text and the PDF is small enough, Gemini receives the PDF inline so it can attempt document/OCR-style reading.
5. Gemini returns JSON only. The server validates every score, list, and string before displaying anything.
6. The server generates a plain-text and HTML MIME email and sends it through Gmail.
7. The website always shows the validated analysis. If Gmail fails, the response is still returned with `emailStatus: "failed"` and a user-safe message.

## Testing the complete workflow

1. Confirm `GEMINI_API_KEY` exists in Replit Secrets.
2. Confirm the Gmail connector is authorized.
3. Open the ResumeIQ preview.
4. Upload a text-based PDF under 8 MB.
5. Select a target role or keep “No specific role”.
6. Enter an email address you control.
7. Click “Review my resume”.
8. Confirm scores and structured sections appear, then confirm the report arrives in the inbox.

The API also exposes a health check:

```bash
curl http://localhost:80/api/healthz
```

## Error handling

- Non-PDF files and files over 8 MB are rejected before analysis.
- Corrupt or unreadable PDFs receive a safe 400 response.
- Gemini failures, invalid JSON, and missing model output receive a safe 502 response.
- Gmail delivery failures do not remove the on-screen report.
- Resume contents are never logged.

## Architecture notes

- OpenAPI is the API source of truth; regenerate hooks after changing `lib/api-spec/openapi.yaml`:

  ```bash
  pnpm --filter @workspace/api-spec run codegen
  ```

- There is no database in the first version. Resume bytes are held only for the request and are not stored.
- PDF uploads use memory storage so no public file URL is created.
- Gmail and Gemini credentials stay server-side.

## Troubleshooting

- **Gemini is unavailable:** verify `GEMINI_API_KEY` is present and valid, then restart the API workflow.
- **Gmail delivery fails:** confirm the Gmail connector is authorized and that the connected account can send mail.
- **The upload is rejected:** confirm the file is a real PDF under 8 MB, not an image renamed with a `.pdf` extension.
- **The preview is blank:** restart the `artifacts/resumeiq: web` workflow and check that the managed workflow is running.