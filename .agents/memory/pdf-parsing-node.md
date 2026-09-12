---
name: Node PDF parsing
description: Node-specific PDF parser compatibility constraints for server-side resume extraction.
---

Use a parser entrypoint that is safe to bundle and start in Node. Some PDF parser package versions load browser canvas globals at module startup, while older package roots may execute a bundled debug harness that reads a test fixture. Verify the exact import entrypoint against the server bundle before relying on it.

**Why:** The API workflow failed during startup twice for parser initialization side effects before the Node-safe entrypoint was selected.

**How to apply:** When changing PDF extraction dependencies, start the server after the package change and confirm the parser import does not require DOMMatrix/canvas or filesystem fixtures before testing uploads.