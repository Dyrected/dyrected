---
title: Docker Deployment
description: Self-hosting Dyrected using Docker.
---

For self-hosted environments or custom cloud providers, you can use our official Docker image.

## Quick Start

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  dyrected/vault:latest
```

## Docker Compose

We recommend using Docker Compose for production setups to manage your database and core engine together.

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: dyrected
      POSTGRES_PASSWORD: password

  vault:
    image: dyrected/vault:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432/dyrected
    depends_on:
      - db
```
