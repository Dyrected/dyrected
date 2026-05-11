---
title: Workspace Management
description: Managing teams and collaborative environments in Dyrected Cloud.
---

Dyrected Cloud is a multi-tenant platform that allows you to manage multiple projects (Workspaces) from a single account.

## Creating a Workspace

When you first sign up for Dyrected Cloud, you'll be prompted to create your first Workspace. A Workspace is an isolated environment that contains its own:
- Database instances.
- Storage buckets.
- API Keys.
- Team members.

## Inviting Team Members

You can invite collaborators to your workspace by their email address.

1. Navigate to the **Team** settings in your dashboard.
2. Enter the email address of the person you want to invite.
3. Select their role (Admin, Editor, or Viewer).

## Site API Keys

To connect your local Next.js or Nuxt app to your Cloud Workspace, you need a **Site API Key**.

- Each site within a workspace has its own unique key.
- These keys should be stored securely in your `.env` file as `DYRECTED_API_KEY`.
