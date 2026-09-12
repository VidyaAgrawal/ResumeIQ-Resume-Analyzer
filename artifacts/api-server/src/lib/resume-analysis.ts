import { ReplitConnectors } from "@replit/connectors-sdk";
import { createRequire } from "node:module";
import { z } from "zod/v4";
import { AnalyzeResumeResponse } from "@workspace/api-zod";
import { logger } from "./logger";

const MAX_INLINE_PDF_BYTES = 6 * 1024 * 1024;
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
  data: Buffer,
) => Promise<{ text: string }>;

const aiAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  atsScore: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  missingSections: z.array(z.string()).default([]),
  keywordSuggestions: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  finalRecommendation: z.string().min(1),
  roleMatch: z.string().min(1),
});

export type ResumeAnalysisInput = {
  email: string;
  role?: string;
  customRole?: string;
  file: Express.Multer.File;
};

export type ResumeAnalysisResult = {
  score: number;
  atsScore: number;
  role: string;
  summary: string;
  strengths: string[];
  missingSkills: string[];
  missingSections: string[];
  keywordSuggestions: string[];
  improvements: string[];
  finalRecommendation: string;
  roleMatch: string;
  emailStatus: "sent" | "failed";
  emailError: string | null;
};

type ReportForEmail = Omit<ResumeAnalysisResult, "emailStatus" | "emailError">;

function cleanText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function decodeGeminiJson(value: string): unknown {
  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(withoutFence);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function listToHtml(items: string[]): string {
  if (items.length === 0) {
    return "<p>None identified.</p>";
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function extractPdfText(file: Express.Multer.File): Promise<string> {
  const result = await pdfParse(file.buffer);
  return cleanText(result.text);
}

async function analyzeWithGemini(
  resumeText: string,
  file: Express.Multer.File,
  role: string,
): Promise<z.infer<typeof aiAnalysisSchema>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini is not configured");
  }

  const roleInstruction = role
    ? `Evaluate this resume specifically for the target role: ${role}.`
    : "Use general resume quality and ATS best practices because no specific role was selected.";
  const sourceInstruction = resumeText
    ? `The following text was extracted from the uploaded PDF. Treat it as the only source of truth:\n\n${resumeText}`
    : "The PDF did not contain selectable text. Inspect the attached PDF document itself if possible. If the document is unreadable, clearly mark information as missing rather than guessing.";

  const parts: Array<Record<string, unknown>> = [
    {
      text: `You are an exacting but helpful resume reviewer. ${roleInstruction}

Analyze only evidence present in the resume. Never invent experience, education, skills, projects, companies, metrics, or achievements. Distinguish facts present in the resume from missing information and from suggestions. Return only valid JSON with exactly these fields:
{
  "score": number from 0 to 100,
  "atsScore": number from 0 to 100,
  "summary": "string",
  "strengths": ["string"],
  "missingSkills": ["string"],
  "missingSections": ["string"],
  "keywordSuggestions": ["string"],
  "improvements": ["string"],
  "finalRecommendation": "string",
  "roleMatch": "string such as Strong, Good, Partial, or Limited"
}

Keep every list specific and actionable. Mention when a recommendation is a suggestion rather than a fact. ${sourceInstruction}`,
    },
  ];

  if (!resumeText && file.buffer.length <= MAX_INLINE_PDF_BYTES) {
    parts.push({
      inline_data: {
        mime_type: "application/pdf",
        data: file.buffer.toString("base64"),
      },
    });
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
          max_output_tokens: 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    logger.error({ status: response.status }, "Gemini analysis request failed");
    throw new Error("Gemini analysis failed");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const generatedText = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!generatedText) {
    throw new Error("Gemini returned an empty analysis");
  }

  try {
    return aiAnalysisSchema.parse(decodeGeminiJson(generatedText));
  } catch {
    logger.error("Gemini returned an invalid structured response");
    throw new Error("Gemini returned an invalid analysis");
  }
}

async function sendReportEmail(
  email: string,
  report: ReportForEmail,
): Promise<{ status: "sent" | "failed"; error: string | null }> {
  const connectors = new ReplitConnectors();
  const subject = `Your ResumeIQ analysis: ${report.score}/100`;
  const plainText = [
    "ResumeIQ — AI-powered resume analysis",
    "",
    `Overall score: ${report.score}/100`,
    `ATS score: ${report.atsScore}/100`,
    `Role: ${report.role}`,
    `Role match: ${report.roleMatch}`,
    "",
    report.summary,
    "",
    "Strengths",
    ...report.strengths.map((item) => `- ${item}`),
    "",
    "Missing skills",
    ...report.missingSkills.map((item) => `- ${item}`),
    "",
    "Missing sections",
    ...report.missingSections.map((item) => `- ${item}`),
    "",
    "ATS and keyword suggestions",
    ...report.keywordSuggestions.map((item) => `- ${item}`),
    "",
    "Resume improvements",
    ...report.improvements.map((item) => `- ${item}`),
    "",
    "Final recommendation",
    report.finalRecommendation,
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#15243b;max-width:680px">
      <h1 style="color:#1b4fe4">ResumeIQ analysis</h1>
      <p><strong>Overall score:</strong> ${report.score}/100<br />
      <strong>ATS score:</strong> ${report.atsScore}/100<br />
      <strong>Role:</strong> ${escapeHtml(report.role)}<br />
      <strong>Role match:</strong> ${escapeHtml(report.roleMatch)}</p>
      <h2>Summary</h2><p>${escapeHtml(report.summary)}</p>
      <h2>Strengths</h2>${listToHtml(report.strengths)}
      <h2>Missing skills</h2>${listToHtml(report.missingSkills)}
      <h2>Missing sections</h2>${listToHtml(report.missingSections)}
      <h2>ATS and keyword suggestions</h2>${listToHtml(report.keywordSuggestions)}
      <h2>Resume improvements</h2>${listToHtml(report.improvements)}
      <h2>Final recommendation</h2><p>${escapeHtml(report.finalRecommendation)}</p>
    </div>
  `;
  const rawMessage = [
    `To: ${email}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="resumeiq-boundary"',
    "",
    "--resumeiq-boundary",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    plainText,
    "",
    "--resumeiq-boundary",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    "",
    "--resumeiq-boundary--",
  ].join("\r\n");

  const response = await connectors.proxy(
    "google-mail",
    "/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64Url(rawMessage) }),
    },
  );

  if (!response.ok) {
    logger.error({ status: response.status }, "Resume report email failed");
    return {
      status: "failed",
      error: "We could not deliver the report email. The analysis is still available below.",
    };
  }

  return { status: "sent", error: null };
}

export async function createResumeAnalysis(
  input: ResumeAnalysisInput,
): Promise<ResumeAnalysisResult> {
  const resumeText = await extractPdfText(input.file);
  const analysis = await analyzeWithGemini(
    resumeText,
    input.file,
    input.role?.trim() ?? "",
  );
  const reportWithoutEmail = {
    ...analysis,
    role: input.role?.trim() || "No specific role",
  };
  const email = await sendReportEmail(input.email, reportWithoutEmail);
  const finalReport: ResumeAnalysisResult = {
    ...reportWithoutEmail,
    emailStatus: email.status,
    emailError: email.error ?? null,
  };

  AnalyzeResumeResponse.parse(finalReport);
  return finalReport;
}