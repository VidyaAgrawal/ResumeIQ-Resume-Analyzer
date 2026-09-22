import { Router, type IRouter } from "express";
import multer from "multer";
import { createResumeAnalysis } from "../lib/resume-analysis";
import { logger } from "../lib/logger";
import { AnalyzeResumeResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post(
  "/resume/analyze",
  upload.single("resume"),
  async (req, res): Promise<void> => {
    const file = req.file;
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const selectedRole =
      typeof req.body.role === "string" ? req.body.role.trim() : "";
    const customRole =
      typeof req.body.customRole === "string" ? req.body.customRole.trim() : "";
    const role =
      selectedRole === "Other"
        ? customRole
        : selectedRole === "No specific role"
          ? ""
          : selectedRole;

    if (!file) {
      res.status(400).json({ error: "Please upload a PDF resume." });
      return;
    }
    const hasPdfSignature = file.buffer.subarray(0, 5).toString() === "%PDF-";
    const hasPdfExtension = file.originalname.toLowerCase().endsWith(".pdf");
    if (file.mimetype !== "application/pdf" && !hasPdfExtension && !hasPdfSignature) {
      res.status(400).json({ error: "Only PDF files are accepted." });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    if (selectedRole === "Other" && !customRole) {
      res.status(400).json({ error: "Please enter the custom role you are targeting." });
      return;
    }

    try {
      const result = await createResumeAnalysis({
        email,
        role,
        customRole,
        file,
      });
      res.json(AnalyzeResumeResponse.parse(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      logger.error({ message: message.slice(0, 300) }, "Resume analysis failed");
      const isInputError =
        message.includes("Invalid PDF") ||
        message.includes("InvalidPDF") ||
        message.includes("PDF") ||
        message.includes("readable");
      res.status(isInputError ? 400 : 502).json({
        error: isInputError
          ? "We could not read that PDF. Please try exporting it again as a standard PDF."
          : "Resume analysis is temporarily unavailable. Please try again.",
      });
    }
  },
);

export default router;