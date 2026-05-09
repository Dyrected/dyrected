---
title: Cloud Platform Deployment
description: Deploying the Dyrected Cloud Server and Management Dashboard.
---

The Dyrected Cloud Platform consists of two primary applications: the **Cloud Server** (Backend API) and the **Cloud Dashboard** (Frontend Management).

## 🚀 Cloud Server (`apps/cloud`)

The Cloud Server is a Hono-based Node.js application that orchestrates multi-tenancy, billing, and API key management.

### Requirements
- **Node.js**: v20 or higher.
- **PostgreSQL**: Primary database for workspaces, users, and metadata.
- **Redis**: Required for BullMQ (background jobs), caching, and usage tracking.

### Environment Variables
Configure these in your hosting provider (e.g., Railway, Fly.io, or AWS):

```bash
DATABASE_URL=postgres://...
REDIS_URL=redis://...
DYRECTED_LICENSE_KEY=your_master_key
PAYSTACK_SECRET_KEY=sk_test_...
JWT_SECRET=your_secret_string
```

### Deployment Steps
1. **Build the project**:
   ```bash
   pnpm install
   pnpm build --filter @dyrected/cloud
   ```
2. **Start the server**:
   ```bash
   cd apps/cloud
   npm start
   ```

---

## 🖥 Cloud Dashboard (`apps/dashboard`)

The Dashboard is a Next.js application where you manage your workspaces and sites.

### Requirements
- **Node.js**: v20 or higher.
- **Cloud Server URL**: The public URL where your Cloud Server is hosted.

### Environment Variables
```bash
NEXT_PUBLIC_CLOUD_API_URL=https://your-cloud-api.com
DATABASE_URL=postgres://... # Same as Cloud Server
__DYRECTED_TOKEN_SECRET=your_jwt_secret # Must match Cloud Server
```

### Deployment Steps (Vercel)
The easiest way to deploy the dashboard is via Vercel:
1. Connect your repository.
2. Set the **Root Directory** to `apps/dashboard`.
3. Add the environment variables above.
4. Deploy.

---

## 📚 Documentation (Mintlify)

1. **Local Preview**:
   ```bash
   npm i -g mintlify
   cd docs
   mintlify dev
   ```
2. **Production**:
   - Push your `docs/` folder to a GitHub repository.
   - Go to [dashboard.mintlify.com](https://dashboard.mintlify.com) and connect your repository.
   - Mintlify will automatically build and host your documentation on a `*.mintlify.app` domain (or your custom domain).
