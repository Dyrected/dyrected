# Changelog

All notable changes to the Dyrected project will be documented in this file.

## [Unreleased]

### Added
- **Core Engine Foundation (@dyrected/core)**:
    - Content Contract Typings (Collection, Global, Field).
    - Configuration API (`defineConfig`, `defineCollection`, `defineGlobal`).
    - Hono-based App Shell with core middleware (Logger, CORS, RequestID).
    - Dynamic Routing system for Collections and Globals.
    - Generic CRUD Controllers.
    - `DatabaseAdapter` interface for pluggable backends.
- **Monorepo Structure**:
    - PNPM Workspaces setup.
    - Turborepo configuration.
    - Full directory tree for packages and apps.
- **Documentation**:
    - Organized specifications in `specs/`.
    - Detailed [Implementation Plan](./specs/implementation_plan.md) with granular breakdown of all 6 build phases.
    - READMEs for all packages and apps.
