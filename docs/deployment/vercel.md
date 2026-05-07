---
title: Vercel Deployment
description: Deploying Dyrected to the Vercel platform.
---

Next.js and Nuxt apps using Dyrected can be deployed to Vercel with zero configuration.

## Environment Variables

Make sure to set the following environment variables in your Vercel project settings:

- `DATABASE_URL`: Your PostgreSQL connection string.
- `DYRECTED_API_KEY`: Your Site API Key (from Dyrected Cloud).
- `NEXT_PUBLIC_DYRECTED_URL`: (Optional) The public URL of your instance.

## Serverless Functions

Dyrected is designed to run efficiently in Serverless Functions. The Hono router ensures fast cold starts and minimal memory overhead.
