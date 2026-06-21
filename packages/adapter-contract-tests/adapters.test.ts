import { afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MongoAdapter } from "../db-mongodb/src/index.js";
import { MysqlAdapter } from "../db-mysql/src/index.js";
import { PostgresAdapter } from "../db-postgres/src/index.js";
import { SqliteAdapter } from "../db-sqlite/src/index.js";
import { B2StorageAdapter } from "../storage-b2/src/index.js";
import { CloudinaryStorageAdapter } from "../storage-cloudinary/src/index.js";
import { LocalStorageAdapter } from "../storage-local/src/index.js";
import { S3StorageAdapter } from "../storage-s3/src/index.js";
import { runDatabaseAdapterContract } from "./database-contract.js";
import { runStorageAdapterContract } from "./storage-contract.js";

const tempPaths: string[] = [];

afterAll(async () => {
  await Promise.all(
    tempPaths.map((path) => rm(path, { recursive: true, force: true })),
  );
});

runDatabaseAdapterContract(
  "SQLite",
  () => new SqliteAdapter({ filename: ":memory:" }),
);

runDatabaseAdapterContract(
  "PostgreSQL",
  () => new PostgresAdapter({ url: process.env.TEST_POSTGRES_URL! }),
  { skip: !process.env.TEST_POSTGRES_URL },
);

runDatabaseAdapterContract(
  "MySQL",
  () => new MysqlAdapter({ url: process.env.TEST_MYSQL_URL! }),
  { skip: !process.env.TEST_MYSQL_URL },
);

runDatabaseAdapterContract(
  "MongoDB",
  () =>
    new MongoAdapter({
      url: process.env.TEST_MONGODB_URL!,
      dbName: process.env.TEST_MONGODB_DB || "dyrected_contract",
    }),
  { skip: !process.env.TEST_MONGODB_URL },
);

runStorageAdapterContract("Local", async () => {
  const uploadDir = await mkdtemp(join(tmpdir(), "dyrected-storage-contract-"));
  tempPaths.push(uploadDir);
  return new LocalStorageAdapter({ uploadDir, staticUrlPrefix: "/uploads" });
});

const runCloudStorageContracts = process.env.RUN_STORAGE_CONTRACTS === "true";

runStorageAdapterContract(
  "S3",
  () =>
    new S3StorageAdapter({
      bucket: process.env.TEST_S3_BUCKET!,
      region: process.env.TEST_S3_REGION!,
      endpoint: process.env.TEST_S3_ENDPOINT,
      baseUrl: process.env.TEST_S3_BASE_URL,
      credentials: {
        accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.TEST_S3_SECRET_ACCESS_KEY!,
      },
    }),
  { skip: !runCloudStorageContracts || !process.env.TEST_S3_BUCKET },
);

runStorageAdapterContract(
  "Backblaze B2",
  () =>
    new B2StorageAdapter({
      applicationKeyId: process.env.TEST_B2_KEY_ID!,
      applicationKey: process.env.TEST_B2_APPLICATION_KEY!,
      bucketId: process.env.TEST_B2_BUCKET_ID!,
      bucketName: process.env.TEST_B2_BUCKET_NAME!,
      baseUrl: process.env.TEST_B2_BASE_URL,
    }),
  { skip: !runCloudStorageContracts || !process.env.TEST_B2_BUCKET_ID },
);

runStorageAdapterContract(
  "Cloudinary",
  () =>
    new CloudinaryStorageAdapter({
      cloudName: process.env.TEST_CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.TEST_CLOUDINARY_API_KEY!,
      apiSecret: process.env.TEST_CLOUDINARY_API_SECRET!,
      folder: "dyrected-contract-tests",
    }),
  {
    skip: !runCloudStorageContracts || !process.env.TEST_CLOUDINARY_CLOUD_NAME,
  },
);
