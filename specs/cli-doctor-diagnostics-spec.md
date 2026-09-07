# Dyrected Doctor & Schema Drift Diagnostics Specification

**Status:** Proposed  
**Owner:** Core / CLI Team  
**Scope:** CLI diagnostic command (`npx dyrected doctor`), dev-mode startup checks, and programmatic diagnostic runtime.

---

## 1. Executive Summary

As Dyrected schemas evolve, discrepancies naturally arise between declared TypeScript schema definitions and physical database records (data drift, un-backfilled defaults, missing columns, orphaned foreign keys).

`npx dyrected doctor` is a proactive diagnostic tool designed to:
1. Scan declared collections, globals, and operational views.
2. Inspect physical database tables and storage providers.
3. Report actionable warnings, schema drift errors, and automated fix migrations.
4. Run lightweight health checks on dev-server startup to warn developers before silent runtime bugs emerge.

---

## 2. Core Diagnostic Capabilities

### 2.1. Schema & Data Drift (The "Unassigned / Missing Defaults" Detector)
- **Default Value Drift:** Detects fields where `defaultValue` is declared in the schema, but rows in the database store `NULL` or missing JSON keys.
  - *Example Output:*
    ```
    ⚠️  [rsvp_records.asoebiPaymentStatus] Schema declares defaultValue: "pending", but 189 rows in DB have NULL.
       → Suggested fix: Run backfill with `npx dyrected doctor --fix`
    ```
- **Un-promoted Column Drift:** Detects fields marked `promoted: true` (or auto-promoted) where the SQL column does not yet exist or where data is not synchronized between the `data` JSONB payload and the dedicated column.
- **Orphaned Relationships:** Identifies foreign key IDs stored in `relationship` fields that point to non-existent target documents.
- **Type Inconsistencies:** Flags rows where stored data types do not match the schema (e.g. string numbers in numeric fields, malformed dates, invalid enum option values).

### 2.2. Operational Views & Query Verification
- **View Conjunction & Operator Validation:** Verifies that view filters and search queries use valid Where DSL operators and valid collection field names.
- **Group Field Validity:** Checks that `groupBy` fields on table/kanban views exist, are scalar/enumerable, and have low cardinality.
- **Date Field Integrity:** Verifies that `dateField`, `startDateField`, and `endDateField` point to real `date` or `datetime` fields.
- **Custom View Component Slots:** Validates that custom component slot names registered in views exist in the admin registry.

### 2.3. Infrastructure & External Provider Health
- **Database Connectivity & Pool:**
  - Tests roundtrip database latency.
  - Validates read/write/DDL privileges (ensuring table and column creations are permitted).
- **Storage Adapter Health:**
  - Validates Cloudinary / S3 / B2 API credentials by performing a non-destructive ping or test asset upload/cleanup.
  - Detects broken media documents referencing unreachable remote URLs.
- **Email / Mailer Health:**
  - Verifies SMTP / Resend / Mailer configuration and catches missing environment variables (e.g. `GMAIL_USER`, `EMAIL_FROM`).
- **Admin Authentication & Secrets:**
  - Warns if `DYRECTED_JWT_SECRET` is unset or using fallback insecure strings in non-development environments.

### 2.4. Performance & Index Optimization
- **Missing Index Warnings:** Flags collections with over 1,000 records where fields used in `filter`, `sort`, or `unique: true` lack dedicated SQL columns or B-Tree indexes.
- **Deep Relationship Loops:** Detects circular default population depths that could cause query amplification.

---

## 3. CLI Command Interface

### 3.1. Interactive Command
```bash
npx dyrected doctor
```
Outputs a formatted terminal report:
- 🟢 **PASS:** Green checkmarks for healthy checks.
- 🟡 **WARN:** Yellow warnings for performance suggestions, missing defaults, or deprecations.
- 🔴 **FAIL:** Red errors for schema violations, broken views, or connection failures.

### 3.2. Automated Fix Mode
```bash
npx dyrected doctor --fix
```
Interactively prompts or automatically executes safe, automated remediations:
1. Prompts: *"Backfill default values for `rsvp_records.asoebiPaymentStatus` (189 rows) with pending? [Y/n]"*
2. Automatically creates an automated pre-flight database backup.
3. Executes batch update and reports results.

### 3.3. CI / Non-Interactive Mode
```bash
npx dyrected doctor --ci
```
Exits with code `0` if all checks pass or only non-blocking warnings exist; exits with `1` if any blocking schema or connection errors are found.

---

## 4. Dev-Mode Startup Integration

When running in dev mode (`npm run dev` / Nuxt / Next plugin):
- Runs a non-blocking background check on boot.
- If data drift or configuration errors are detected, prints a succinct, friendly diagnostic banner in the server console:
  ```
  🩺 [Dyrected Doctor] 1 schema drift issue detected in "rsvp_records".
     Run "npx dyrected doctor" to inspect and fix.
  ```
