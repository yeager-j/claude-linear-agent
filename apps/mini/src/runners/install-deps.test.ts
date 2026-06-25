import { test, expect, describe, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectInstall } from "./install-deps.ts";

const made: string[] = [];
function make(files: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "install-detect-"));
  for (const f of files) writeFileSync(join(dir, f), "");
  made.push(dir);
  return dir;
}
afterEach(() => {
  while (made.length) rmSync(made.pop()!, { recursive: true, force: true });
});

describe("detectInstall", () => {
  test("no package.json => null (nothing to install)", () => {
    expect(detectInstall(make([]))).toBeNull();
  });
  test("bun.lock => bun install", () => {
    expect(detectInstall(make(["package.json", "bun.lock"]))).toEqual({ cmd: "bun", args: ["install"] });
  });
  test("pnpm-lock.yaml => pnpm --frozen-lockfile", () => {
    expect(detectInstall(make(["package.json", "pnpm-lock.yaml"]))).toEqual({
      cmd: "pnpm",
      args: ["install", "--frozen-lockfile"],
    });
  });
  test("yarn.lock => yarn --frozen-lockfile", () => {
    expect(detectInstall(make(["package.json", "yarn.lock"]))).toEqual({
      cmd: "yarn",
      args: ["install", "--frozen-lockfile"],
    });
  });
  test("package-lock.json => npm ci", () => {
    expect(detectInstall(make(["package.json", "package-lock.json"]))).toEqual({ cmd: "npm", args: ["ci"] });
  });
  test("package.json only => npm install", () => {
    expect(detectInstall(make(["package.json"]))).toEqual({ cmd: "npm", args: ["install"] });
  });
});
