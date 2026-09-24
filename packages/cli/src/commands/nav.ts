import type { Command } from "commander";
import type { UserNavigationPreferences } from "@dyrected/core";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { createJiti } from "jiti";
import { compileNavigation } from "@dyrected/core";
import { loadCommandEnv } from "../utils/env.js";
import {
  reconcilePreferencesToWorkspaceOptions,
  serializeWorkspacesToTypeScript,
} from "../utils/nav-serializer.js";
import { patchConfigNavigation } from "../utils/config-patcher.js";

export function registerNav(program: Command) {
  const navCommand = program
    .command("nav")
    .description("Synchronize admin navigation between UI preferences and TypeScript code");

  // Subcommand: nav pull
  navCommand
    .command("pull")
    .description("Pull navigation preferences from server/UI and serialize into dyrected.config.ts")
    .option("-c, --config <path>", "Path to your dyrected.config.ts", "./dyrected.config.ts")
    .option("-u, --url <url>", "Dyrected API URL (defaults to $DYRECTED_URL or http://localhost:3000)")
    .option("-k, --api-key <key>", "API key for authentication")
    .option("-t, --token <token>", "Bearer token for authentication")
    .option("-s, --scope <scope>", "Preference scope to pull: 'global' | 'role' | 'personal'", "global")
    .option("-r, --role <role>", "Role name (required if scope is 'role')")
    .option("-f, --file <path>", "Pull preferences from a local JSON file instead of network")
    .option("--env-path <path>", "Path to an env file to load")
    .option("-d, --dry-run", "Output generated TypeScript to stdout without modifying files")
    .option("-o, --output <path>", "Write the generated navigation to a separate file instead of updating dyrected.config.ts")
    .addHelpText(
      "after",
      `
Examples:
  # Pull global navigation preferences from local dev server into dyrected.config.ts
  $ npx dyrected nav pull

  # Preview the code that would be generated without writing to disk
  $ npx dyrected nav pull --dry-run

  # Pull navigation configured for a specific role (e.g. 'compliance_officer')
  $ npx dyrected nav pull --scope role --role compliance_officer

  # Pull navigation from an exported JSON preferences file
  $ npx dyrected nav pull --file ./nav-export.json

  # Export pulled navigation to a standalone navigation.ts file
  $ npx dyrected nav pull --output ./src/navigation.ts
`,
    )
    .action(async (options) => {
      try {
        await loadCommandEnv({ cwd: process.cwd(), envPath: options.envPath });

        let prefs: UserNavigationPreferences;

        if (options.file) {
          const filePath = path.resolve(process.cwd(), options.file);
          if (!(await fs.pathExists(filePath))) {
            throw new Error(`Preferences file not found at ${filePath}`);
          }
          console.log(chalk.blue(`Loading preferences from ${filePath}...`));
          const fileRaw = await fs.readFile(filePath, "utf-8");
          const parsed = JSON.parse(fileRaw);
          prefs = (parsed.value || parsed) as UserNavigationPreferences;
        } else {
          const apiUrl =
            options.url ||
            process.env.DYRECTED_URL ||
            process.env.NEXT_PUBLIC_DYRECTED_URL ||
            process.env.NUXT_PUBLIC_DYRECTED_URL ||
            process.env.VITE_DYRECTED_URL ||
            "http://localhost:3000";

          const apiKey = options.apiKey || process.env.DYRECTED_API_KEY;
          const token = options.token || process.env.DYRECTED_TOKEN;
          const scope = options.scope || "global";
          const roleQuery = options.role ? `&role=${encodeURIComponent(options.role)}` : "";

          const url = `${apiUrl.replace(/\/$/, "")}/api/preferences/admin:navigation?scope=${scope}${roleQuery}`;
          console.log(chalk.blue(`Pulling navigation preferences from ${url}...`));

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
            headers["X-API-Key"] = apiKey;
          } else if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const response = await fetch(url, { method: "GET", headers });
          if (!response.ok) {
            throw new Error(`Failed to fetch preferences: ${response.status} ${response.statusText}`);
          }

          const json = await response.json();
          const rawValue = json?.value ?? json?.data ?? json;

          if (!rawValue || typeof rawValue !== "object") {
            console.warn(
              chalk.yellow(
                `⚠ No saved navigation preferences found for scope '${scope}'. Using system defaults.`,
              ),
            );
            prefs = {
              _version: 1,
              groups: [],
              items: [],
              pinned: [],
              hidden: [],
              groupOrder: [],
              itemOrder: {},
            };
          } else {
            prefs = rawValue as UserNavigationPreferences;
          }
        }

        // Load project config if available
        const configPath = path.resolve(process.cwd(), options.config);
        let projectConfig: any = undefined;

        if (await fs.pathExists(configPath)) {
          try {
            console.log(chalk.blue(`Loading existing config from ${configPath}...`));
            const jiti = createJiti(configPath);
            const configModule = (await jiti.import(configPath)) as any;
            projectConfig = configModule.default || configModule;
          } catch (e: any) {
            console.warn(
              chalk.yellow(`⚠ Could not load project config: ${e.message}. Using standalone preferences.`),
            );
          }
        }

        // Reconcile preferences with config
        const workspaces = reconcilePreferencesToWorkspaceOptions(prefs, projectConfig);
        const serializedNav = await serializeWorkspacesToTypeScript(workspaces);

        if (options.dryRun) {
          console.log(chalk.green(`\n✔ Generated TypeScript Navigation (${workspaces.length} items):\n`));
          console.log(chalk.cyan(serializedNav));
          console.log("");
          return;
        }

        if (options.output) {
          const outputPath = path.resolve(process.cwd(), options.output);
          await fs.ensureDir(path.dirname(outputPath));
          const fileContent = `import { defineWorkspace } from "@dyrected/core";\n\nexport const navigation = ${serializedNav};\n`;
          await fs.writeFile(outputPath, fileContent, "utf-8");
          console.log(chalk.green(`✔ Wrote navigation to ${path.relative(process.cwd(), outputPath)}`));
          return;
        }

        if (!(await fs.pathExists(configPath))) {
          throw new Error(`Config file not found at ${configPath}. Use --output to write to a new file.`);
        }

        const existingContent = await fs.readFile(configPath, "utf-8");
        const patchedContent = await patchConfigNavigation(existingContent, serializedNav);

        await fs.writeFile(configPath, patchedContent, "utf-8");
        console.log(
          chalk.green(
            `✔ Successfully synchronized navigation into ${path.relative(process.cwd(), configPath)} (${workspaces.length} workspaces)`,
          ),
        );
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    });

  // Subcommand: nav push
  navCommand
    .command("push")
    .description("Push code-defined navigation from dyrected.config.ts to server preferences")
    .option("-c, --config <path>", "Path to your dyrected.config.ts", "./dyrected.config.ts")
    .option("-u, --url <url>", "Dyrected API URL (defaults to $DYRECTED_URL or http://localhost:3000)")
    .option("-k, --api-key <key>", "API key for authentication")
    .option("-t, --token <token>", "Bearer token for authentication")
    .option("-s, --scope <scope>", "Preference scope to push: 'global' | 'role'", "global")
    .option("-r, --role <role>", "Role name (required if scope is 'role')")
    .option("-o, --output <path>", "Export navigation preferences to a local JSON file instead of pushing to server")
    .option("--env-path <path>", "Path to an env file to load")
    .addHelpText(
      "after",
      `
Examples:
  # Push current code navigation to server as global default
  $ npx dyrected nav push

  # Push code navigation as default for a specific role
  $ npx dyrected nav push --scope role --role manager

  # Export code navigation structure to a JSON file
  $ npx dyrected nav push --output ./nav-export.json
`,
    )
    .action(async (options) => {
      try {
        await loadCommandEnv({ cwd: process.cwd(), envPath: options.envPath });

        const configPath = path.resolve(process.cwd(), options.config);
        if (!(await fs.pathExists(configPath))) {
          throw new Error(`Config file not found at ${configPath}`);
        }

        console.log(chalk.blue(`Loading config from ${configPath}...`));
        const jiti = createJiti(configPath);
        const configModule = (await jiti.import(configPath)) as any;
        const config = configModule.default || configModule;

        const compiledTree = compileNavigation(config);

        const groups = compiledTree.groups.map((g) => ({
          name: g.name,
          slug: g.slug,
          icon: g.icon,
          defaultExpanded: g.defaultExpanded,
          order: g.order,
        }));

        const items = compiledTree.groups
          .flatMap((g) => g.items)
          .concat(compiledTree.ungrouped)
          .map((item) => ({
            slug: item.slug,
            label: item.label,
            icon: item.icon,
            group: item.group,
            order: item.order,
            collection: item.collection,
            global: item.global,
            badge: item.badge,
            views: item.views,
          }));

        const groupOrder = compiledTree.groups.map((g) => g.slug || g.name);
        const itemOrder: Record<string, string[]> = {};
        for (const g of compiledTree.groups) {
          itemOrder[g.slug || g.name] = g.items.map((i) => i.slug);
        }

        const payload: UserNavigationPreferences = {
          _version: 1,
          groups,
          items,
          groupOrder,
          itemOrder,
          pinned: [],
          hidden: [],
        };

        if (options.output) {
          const outputPath = path.resolve(process.cwd(), options.output);
          await fs.ensureDir(path.dirname(outputPath));
          await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), "utf-8");
          console.log(chalk.green(`✔ Exported navigation preferences to ${path.relative(process.cwd(), outputPath)}`));
          return;
        }

        const apiUrl =
          options.url ||
          process.env.DYRECTED_URL ||
          process.env.NEXT_PUBLIC_DYRECTED_URL ||
          process.env.NUXT_PUBLIC_DYRECTED_URL ||
          process.env.VITE_DYRECTED_URL ||
          "http://localhost:3000";

        const apiKey = options.apiKey || process.env.DYRECTED_API_KEY;
        const token = options.token || process.env.DYRECTED_TOKEN;
        const scope = options.scope || "global";
        const roleQuery = options.role ? `&role=${encodeURIComponent(options.role)}` : "";

        const url = `${apiUrl.replace(/\/$/, "")}/api/preferences/admin:navigation?scope=${scope}${roleQuery}`;
        console.log(chalk.blue(`Pushing navigation preferences to ${url}...`));

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
          headers["X-API-Key"] = apiKey;
        } else if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Failed to push preferences: ${response.status} ${response.statusText} (${errBody})`);
        }

        console.log(
          chalk.green(
            `✔ Successfully pushed code navigation to ${scope} preferences (${items.length} items across ${groups.length} groups)`,
          ),
        );
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    });
}
