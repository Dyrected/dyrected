export function buildDbConfig(db: string): string {
  switch (db) {
    case "postgres":
      return `postgresAdapter({ url: process.env.DATABASE_URL! })`;
    case "mysql":
      return `mysqlAdapter({ url: process.env.DATABASE_URL! })`;
    case "sqlite":
      return `sqliteAdapter({ filename: './data.db' })`;
    case "mongodb":
      return `mongodbAdapter({ url: process.env.DATABASE_URL!, dbName: process.env.MONGODB_DB_NAME || 'dyrected' })`;
    default:
      return `postgresAdapter({ url: process.env.DATABASE_URL! })`;
  }
}

export function buildStorageConfig(storage: string): string {
  switch (storage) {
    case "local":
      return `localStorage({ uploadDir: './public/uploads', staticUrlPrefix: '/uploads' })`;
    case "s3":
      return `s3Storage({ bucket: process.env.S3_BUCKET!, region: process.env.S3_REGION!, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } })`;
    case "b2":
      return `b2Storage({ bucketId: process.env.B2_BUCKET_ID!, bucketName: process.env.B2_BUCKET_NAME!, applicationKeyId: process.env.B2_KEY_ID!, applicationKey: process.env.B2_APPLICATION_KEY! })`;
    case "cloudinary":
      return `cloudinaryStorage({ cloudName: process.env.CLOUDINARY_CLOUD_NAME!, apiKey: process.env.CLOUDINARY_API_KEY!, apiSecret: process.env.CLOUDINARY_API_SECRET! })`;
    default:
      return `localStorage({ uploadDir: './public/uploads', staticUrlPrefix: '/uploads' })`;
  }
}

export function buildEnvTemplate(db: string, storage: string, framework: string): string {
  const lines = [
    `# Dyrected CMS — Environment Variables`,
    `DATABASE_URL=${
      db === "mongodb"
        ? "mongodb://localhost:27017/dyrected"
        : db === "mysql"
          ? "mysql://user:pass@localhost:3306/dyrected"
          : "postgres://user:pass@localhost:5432/dyrected"
    }`,
    `JWT_SECRET=change-me-32-characters-minimum`,
    `ENCRYPTION_KEY=change-me-aes-256-key`,
    ``,
  ];

  if (storage === "s3") {
    lines.push(`S3_BUCKET=my-bucket`, `S3_REGION=us-east-1`, `S3_ACCESS_KEY_ID=`, `S3_SECRET_ACCESS_KEY=`);
  } else if (storage === "b2") {
    lines.push(`B2_BUCKET_ID=`, `B2_BUCKET_NAME=`, `B2_KEY_ID=`, `B2_APPLICATION_KEY=`);
  } else if (storage === "cloudinary") {
    lines.push(`CLOUDINARY_CLOUD_NAME=`, `CLOUDINARY_API_KEY=`, `CLOUDINARY_API_SECRET=`);
  }

  if (db === "mongodb") lines.push(`MONGODB_DB_NAME=dyrected`);

  const prefix = framework === "next" ? "NEXT_PUBLIC_" : "NUXT_PUBLIC_";
  lines.push(``, `${prefix}DYRECTED_URL=http://localhost:3000`, `${prefix}DYRECTED_API_KEY=local-dev`);
  return lines.join("\n") + "\n";
}

export function buildViteEnvTemplate(): string {
  return (
    [
      `# Dyrected CMS — Environment Variables`,
      `# Connect to Dyrected Cloud or a self-hosted instance`,
      `VITE_DYRECTED_URL=https://cloud.dyrected.cloud`,
      `VITE_DYRECTED_API_KEY=sk_live_...`,
      `VITE_DYRECTED_SITE_ID=site_...`,
    ].join("\n") + "\n"
  );
}
