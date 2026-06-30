---
"@dyrected/admin": patch
---

Fix CSV importer: drag & drop, file validation, empty file rejection, invalid row handling, and network failure retry

- Drag and drop now works on the upload zone (was advertised but never wired up) (CI-005)
- Non-CSV files dropped or selected show a clear "Unsupported file type" error and stay on the upload screen (CI-005)
- Empty CSV files (zero data rows) are rejected with an explicit message instead of advancing to a blank mapping step (CI-006)
- At the preview step, if all rows are invalid the Start Import button is disabled and a blocking error is shown; if some rows are invalid an acknowledgement checkbox must be checked before import can proceed, preventing silent partial data creation (CI-029)
- Rows that fail due to network or API errors during import are tracked separately from validation failures; a "Retry N Failed Rows" button appears on the complete screen so users can retry without re-uploading or re-mapping (CI-030)
