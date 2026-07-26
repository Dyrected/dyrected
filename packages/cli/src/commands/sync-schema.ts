import type { Command } from "commander";
import type { DyrectedConfig } from "@dyrected/core";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { createJiti } from "jiti";
import { runGenerateTypes } from "../utils/type-generator.js";
import { loadCommandEnv } from "../utils/env.js";
import { resolveAppSrcDir } from "../utils/detect.js";
import {
  assertValidAdminConditionsInConfig,
  assertValidDeclarativeAccessInConfig,
  assertValidDeclarativeHooksInConfig,
  assertValidPreviewUrlsInConfig,
} from "@dyrected/core";

type CloudSyncConfig = Pick<
  DyrectedConfig,
  "blocks" | "collections" | "globals" | "accessPolicies" | "admin"
>;

function isNamedPolicy(value: unknown): value is { policy: string; params?: Record<string, unknown> } {
  return (
    !!value &&
    typeof value === "object" &&
    "policy" in value &&
    typeof (value as { policy?: unknown }).policy === "string"
  );
}

function sanitizeAccessValue(value: unknown, location: string, warnings: string[]): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (isNamedPolicy(value)) return value;

  if (typeof value === "function") {
    warnings.push(location);
    return undefined;
  }

  return value;
}

function sanitizeHookArray(
  hooks: unknown,
  location: string,
  warnings: string[],
  options: { allowStrings: boolean },
): string[] | undefined {
  if (!Array.isArray(hooks)) return undefined;

  const sanitized = hooks.flatMap((hook, index) => {
    if (typeof hook === "string" && options.allowStrings) {
      return [hook];
    }

    if (typeof hook === "function" || typeof hook === "string") {
      warnings.push(`${location}[${index}]`);
    }

    return [];
  });

  return sanitized.length > 0 ? sanitized : undefined;
}

function sanitizeHookMap(
  hooks: Record<string, unknown> | undefined,
  location: string,
  warnings: string[],
  allowStringsByKey: Record<string, boolean>,
) {
  if (!hooks) return undefined;

  const sanitized = Object.fromEntries(
    Object.entries(allowStringsByKey).flatMap(([key, allowStrings]) => {
      const value = sanitizeHookArray(hooks[key], `${location}.${key}`, warnings, { allowStrings });
      return value ? [[key, value]] : [];
    }),
  );

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeField(field: Record<string, any>, location: string, warnings: string[]) {
  const sanitized = { ...field };

  if (sanitized.hooks) {
    const beforeChange = sanitizeHookArray(sanitized.hooks.beforeChange, `${location}.hooks.beforeChange`, warnings, {
      allowStrings: true,
    });
    const afterRead = sanitizeHookArray(sanitized.hooks.afterRead, `${location}.hooks.afterRead`, warnings, {
      allowStrings: false,
    });

    sanitized.hooks = {
      ...(beforeChange ? { beforeChange } : {}),
      ...(afterRead ? { afterRead } : {}),
    };

    if (Object.keys(sanitized.hooks).length === 0) {
      delete sanitized.hooks;
    }
  }

  if (sanitized.admin?.hooks) {
    const hooks = { ...sanitized.admin.hooks };
    const onChange =
      typeof hooks.onChange === "string"
        ? hooks.onChange
        : typeof hooks.onChange === "function"
          ? (warnings.push(`${location}.admin.hooks.onChange`), undefined)
          : undefined;

    if (typeof hooks.options === "function" || typeof hooks.options === "string") {
      warnings.push(`${location}.admin.hooks.options`);
    }

    sanitized.admin = {
      ...sanitized.admin,
      hooks: {
        ...(onChange ? { onChange } : {}),
      },
    };

    if (Object.keys(sanitized.admin.hooks).length === 0) {
      delete sanitized.admin.hooks;
    }
  }

  if (sanitized.access) {
    sanitized.access = {
      ...(sanitized.access.read !== undefined
        ? {
            read: sanitizeAccessValue(sanitized.access.read, `${location}.access.read`, warnings),
          }
        : {}),
      ...(sanitized.access.create !== undefined
        ? {
            create: sanitizeAccessValue(sanitized.access.create, `${location}.access.create`, warnings),
          }
        : {}),
      ...(sanitized.access.update !== undefined
        ? {
            update: sanitizeAccessValue(sanitized.access.update, `${location}.access.update`, warnings),
          }
        : {}),
    };
  }

  if (Array.isArray(sanitized.fields)) {
    sanitized.fields = sanitized.fields.map((child: Record<string, any>, index: number) =>
      sanitizeField(child, `${location}.fields[${index}]`, warnings),
    );
  }

  if (Array.isArray(sanitized.blocks)) {
    sanitized.blocks = sanitized.blocks.map((block: Record<string, any>, blockIndex: number) => ({
      ...block,
      fields: Array.isArray(block.fields)
        ? block.fields.map((child: Record<string, any>, fieldIndex: number) =>
            sanitizeField(child, `${location}.blocks[${blockIndex}].fields[${fieldIndex}]`, warnings),
          )
        : block.fields,
    }));
  }

  return sanitized;
}

export function sanitizeSchemaForCloudSync(config: CloudSyncConfig) {
  assertValidDeclarativeHooksInConfig(config, "sync:schema");
  assertValidDeclarativeAccessInConfig(config, "sync:schema");
  assertValidAdminConditionsInConfig(config, "sync:schema");
  assertValidPreviewUrlsInConfig(config, "sync:schema");
  const warnings: string[] = [];

  const blocks = (config.blocks || []).map((block, index) => ({
    ...block,
    fields: Array.isArray(block.fields)
      ? block.fields.map((field: Record<string, any>, fieldIndex: number) =>
          sanitizeField(field, `blocks[${index}].fields[${fieldIndex}]`, warnings),
        )
      : block.fields,
  }));

  const collections = config.collections.map((collection, index) => {
    const collName = collection.slug ? `collection('${collection.slug}')` : `collections[${index}]`;
    const hooks = sanitizeHookMap(collection.hooks, `${collName}.hooks`, warnings, {
      beforeRead: true,
      afterRead: true,
      beforeChange: true,
      afterChange: false,
      beforeDelete: false,
      afterDelete: false,
    });

    return {
      ...collection,
      access: {
        ...(collection.access?.read !== undefined
          ? {
              read: sanitizeAccessValue(collection.access.read, `${collName}.access.read`, warnings),
            }
          : {}),
        ...(collection.access?.create !== undefined
          ? {
              create: sanitizeAccessValue(collection.access.create, `${collName}.access.create`, warnings),
            }
          : {}),
        ...(collection.access?.update !== undefined
          ? {
              update: sanitizeAccessValue(collection.access.update, `${collName}.access.update`, warnings),
            }
          : {}),
        ...(collection.access?.delete !== undefined
          ? {
              delete: sanitizeAccessValue(collection.access.delete, `${collName}.access.delete`, warnings),
            }
          : {}),
        ...(collection.access?.readAudit !== undefined
          ? {
              readAudit: sanitizeAccessValue(
                collection.access.readAudit,
                `${collName}.access.readAudit`,
                warnings,
              ),
            }
          : {}),
      },
      ...(hooks ? { hooks } : {}),
      fields: Array.isArray(collection.fields)
        ? collection.fields.map((field: Record<string, any>, fieldIndex: number) => {
            const fieldId = field.name ? `field('${field.name}')` : field.label ? `field('${field.label}')` : `fields[${fieldIndex}]`;
            return sanitizeField(field, `${collName}.${fieldId}`, warnings);
          })
        : collection.fields,
    };
  });

  const globals = (config.globals || []).map((global, index) => {
    const globName = global.slug ? `global('${global.slug}')` : `globals[${index}]`;
    const hooks = sanitizeHookMap(global.hooks, `${globName}.hooks`, warnings, {
      beforeRead: true,
      afterRead: true,
      beforeChange: true,
      afterChange: false,
    });

    return {
      ...global,
      access: {
        ...(global.access?.read !== undefined
          ? {
              read: sanitizeAccessValue(global.access.read, `${globName}.access.read`, warnings),
            }
          : {}),
        ...(global.access?.update !== undefined
          ? {
              update: sanitizeAccessValue(global.access.update, `${globName}.access.update`, warnings),
            }
          : {}),
      },
      ...(hooks ? { hooks } : {}),
      fields: Array.isArray(global.fields)
        ? global.fields.map((field: Record<string, any>, fieldIndex: number) => {
            const fieldId = field.name ? `field('${field.name}')` : field.label ? `field('${field.label}')` : `fields[${fieldIndex}]`;
            return sanitizeField(field, `${globName}.${fieldId}`, warnings);
          })
        : global.fields,
    };
  });

  const accessPolicies = Object.fromEntries(
    Object.entries(config.accessPolicies || {}).flatMap(([name, value]) => {
      if (typeof value === "boolean" || typeof value === "string") {
        return [[name, value]];
      }

      if (typeof value === "function") {
        warnings.push(`accessPolicies.${name}`);
      }

      return [];
    }),
  );

  return {
    payload: {
      blocks,
      collections,
      globals,
      accessPolicies,
      admin: config.admin || {},
    },
    warnings,
  };
}

export function registerSyncSchema(program: Command) {
  program
    .command("sync:schema")
    .description("Sync your local Dyrected schema with the Cloud dashboard")
    .option("-k, --api-key <key>", "Your Dyrected API Key")
    .option("-s, --site-id <id>", "Your Dyrected Site ID")
    .option("-u, --url <url>", "Cloud API URL (defaults to $DYRECTED_URL, then Dyrected Cloud)")
    .option("-c, --config <path>", "Path to your dyrected.config.ts", "./dyrected.config.ts")
    .option("--env-path <path>", "Path to an env file to load before syncing")
    .option("--skip-on-error", "Do not exit with error if sync fails (useful for CI builds)")
    .option("--skip-types", "Skip automatic type generation after a successful sync")
    .addHelpText(
      "after",
      `
Examples:
  # Sync using env vars (DYRECTED_API_KEY, DYRECTED_SITE_ID)
  $ npx dyrected sync:schema

  # Sync using a specific env file
  $ npx dyrected sync:schema --env-path ./.env.local

  # Sync with explicit credentials
  $ npx dyrected sync:schema --api-key <key> --site-id <id>

  # Sync in CI without failing the build on error
  $ npx dyrected sync:schema --skip-on-error

  # Sync without regenerating types
  $ npx dyrected sync:schema --skip-types
`,
    )
    .action(async (options) => {
      try {
        await loadCommandEnv({ cwd: process.cwd(), envPath: options.envPath });

        const apiKey = options.apiKey || process.env.DYRECTED_API_KEY;
        const siteId = options.siteId || process.env.DYRECTED_SITE_ID;
        const apiUrl =
          options.url ||
          process.env.DYRECTED_URL ||
          process.env.NEXT_PUBLIC_DYRECTED_URL ||
          process.env.NUXT_PUBLIC_DYRECTED_URL ||
          process.env.VITE_DYRECTED_URL ||
          "https://cloud.dyrected.com";
        const configPath = path.resolve(process.cwd(), options.config);

        if (!apiKey || !siteId) {
          console.warn(
            chalk.yellow(
              "\n⚠  Skipping schema sync: API Key or Site ID missing. (Required for Cloud sync, but optional for self-hosted builds)\n",
            ),
          );
          return;
        }

        if (!(await fs.pathExists(configPath))) {
          throw new Error(`Config file not found at ${configPath}`);
        }

        console.log(chalk.blue(`Loading config from ${configPath}...`));
        const jiti = createJiti(configPath);
        const configModule = (await jiti.import(configPath)) as any;
        const config = configModule.default || configModule;

        if (!config.collections) throw new Error("Invalid config: No collections found.");

        console.log(chalk.blue(`Syncing schema to ${apiUrl}...`));

        const { payload, warnings } = sanitizeSchemaForCloudSync({
          blocks: config.blocks || [],
          collections: config.collections,
          globals: config.globals || [],
          accessPolicies: config.accessPolicies || {},
          admin: config.admin || {},
        });

        if (warnings.length > 0) {
          console.warn(
            chalk.yellow("\n⚠  Cloud sync stripped unsupported function-based access rules at these paths:"),
          );
          for (const warning of warnings) {
            console.warn(chalk.yellow(`   - ${warning}`));
          }
          console.warn(
            chalk.yellow(
              "   Cloud will not enforce stripped rules. Replace them with a Jexl string or a named policy before relying on Cloud access control.\n",
            ),
          );
        }

        const response = await fetch(`${apiUrl}/cloud/workspaces/sites/${siteId}/schema/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-API-Key": apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Sync failed: ${error.message || response.statusText}`);
        }

        console.log(chalk.green(`✔  Schema synced successfully for site ${siteId}`));

        if (!options.skipTypes) {
          console.log(chalk.blue("\nGenerating types from synced schema..."));
          // Write generated types into the framework source dir so the schema
          // augmentation is picked up by the TypeScript program.
          const srcDir = resolveAppSrcDir(process.cwd());
          await runGenerateTypes({
            config: options.config,
            output: path.join(srcDir, "dyrected-types.ts"),
          });
        }
      } catch (error: any) {
        if (options.skipOnError) {
          console.warn(chalk.yellow(`\n⚠  Sync failed, but skipping error as requested: ${error.message}`));
          return;
        }
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    });
}
