// Install the target repo's dependencies in the worktree BEFORE the Claude agent runs, so the
// agent doesn't have to spend a turn (and tokens) installing them itself before it can run
// typechecks/tests. Best-effort: a failed install never fails the job — the agent can still
// install on its own if it needs to.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { log } from "../log.ts";

export interface InstallPlan {
  cmd: string;
  args: string[];
}

// Pick the install command from the lockfile present in the worktree. Pure + testable.
// Returns null when there's nothing to install (no package.json).
export function detectInstall(worktreePath: string): InstallPlan | null {
  const has = (f: string) => existsSync(join(worktreePath, f));
  if (!has("package.json")) return null;
  if (has("bun.lock") || has("bun.lockb")) return { cmd: "bun", args: ["install"] };
  if (has("pnpm-lock.yaml")) return { cmd: "pnpm", args: ["install", "--frozen-lockfile"] };
  if (has("yarn.lock")) return { cmd: "yarn", args: ["install", "--frozen-lockfile"] };
  if (has("package-lock.json")) return { cmd: "npm", args: ["ci"] };
  return { cmd: "npm", args: ["install"] };
}

export async function installDeps(worktreePath: string): Promise<void> {
  const plan = detectInstall(worktreePath);
  if (!plan) return;
  log.info("installing dependencies", { worktreePath, cmd: `${plan.cmd} ${plan.args.join(" ")}` });
  try {
    const proc = Bun.spawn([plan.cmd, ...plan.args], {
      cwd: worktreePath,
      stdout: "ignore",
      stderr: "ignore",
    });
    const code = await proc.exited;
    if (code !== 0) {
      log.warn("dependency install exited non-zero (continuing)", { worktreePath, code });
    }
  } catch (err) {
    log.warn("dependency install failed (continuing)", { worktreePath, err: String(err) });
  }
}
