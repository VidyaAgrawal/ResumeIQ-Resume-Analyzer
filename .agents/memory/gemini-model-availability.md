---
name: Gemini model availability
description: Provider model availability behavior discovered while validating ResumeIQ's Gemini integration.
---

Treat a Gemini model-specific 404 as a provider availability/deprecation response, not automatically as a missing secret or broken route. Read the bounded provider error before changing request plumbing; the provider may name the replacement model. Transient 429/5xx responses should be retried a small, bounded number of times.

**Why:** The configured model returned a 404 saying it was unavailable to new users, and the replacement model initially returned a temporary 503 before succeeding on a later attempt.

**How to apply:** Keep model selection centralized, log only bounded provider status/error text without request contents or credentials, and validate the complete multipart endpoint after any model change.