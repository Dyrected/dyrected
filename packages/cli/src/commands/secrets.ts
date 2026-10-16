import type { Command } from "commander";
import chalk from "chalk";
import { cloudRequest, resolveCloudTarget } from "../utils/cloud-client.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

export function registerSecrets(program: Command) {
  const secrets = program
    .command("secrets")
    .description("Manage the secrets your deployed functions read as process.env.NAME")
    .option("-k, --api-key <key>", "Your Dyrected API Key")
    .option("-s, --site-id <id>", "Your Dyrected Project ID")
    .option("-u, --url <url>", "Cloud API URL")
    .option("--env-path <path>", "Path to an env file to load first")
    .addHelpText(
      "after",
      `
Values are encrypted at rest and write-only: you can set and delete them, but never read them back.
Names use capital letters, numbers and underscores (for example STRIPE_KEY).

Examples:
  $ npx dyrected secrets set STRIPE_KEY sk_live_...
  $ echo "$TOKEN" | npx dyrected secrets set WEBHOOK_TOKEN --stdin
  $ npx dyrected secrets list
  $ npx dyrected secrets delete STRIPE_KEY
`,
    );

  const run = (action: (target: Awaited<ReturnType<typeof resolveCloudTarget>>, args: any[]) => Promise<void>) =>
    async (...args: any[]) => {
      try {
        const command = args[args.length - 1] as Command;
        const target = await resolveCloudTarget({ ...secrets.opts(), ...command.opts() });
        await action(target, args);
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    };

  secrets
    .command("set <name> [value]")
    .description("Create or replace a secret")
    .option("--stdin", "Read the value from standard input instead of the command line")
    .action(
      run(async (target, [name, value, options]) => {
        const resolved = options.stdin ? await readStdin() : value;
        if (!resolved) throw new Error("Give a value, or pipe one in with --stdin.");
        await cloudRequest(target, `/secrets/${name}`, { method: "PUT", body: { value: resolved } });
        console.log(chalk.green(`✔  ${name} saved. It is available to deployed functions as process.env.${name}.`));
      }),
    );

  secrets
    .command("list")
    .description("List secret names")
    .action(
      run(async (target) => {
        const { secrets: names } = await cloudRequest<{ secrets: Array<{ name: string }> }>(target, "/secrets");
        if (names.length === 0) console.log("No secrets set.");
        for (const { name } of names) console.log(name);
      }),
    );

  secrets
    .command("delete <name>")
    .description("Delete a secret")
    .action(
      run(async (target, [name]) => {
        await cloudRequest(target, `/secrets/${name}`, { method: "DELETE" });
        console.log(chalk.green(`✔  ${name} deleted.`));
      }),
    );
}
