#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const files = [
  "README.md",
  "docs/shortcut-guide.md",
  "modules/wloc.conf",
  "modules/wloc.lpx",
  "modules/wloc.module",
  "modules/wloc.sgmodule",
  "modules/wloc.stoverride",
];

const defaults = {
  repo: "",
  branch: "main",
  workerUrl: "",
  pageUrl: "",
  author: "Self-maintained fork",
  dryRun: false,
};

function parseArgs(argv) {
  const cfg = { ...defaults };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} 缺少参数`);
      return argv[++i];
    };
    if (a === "--repo") cfg.repo = normalizeRepo(next());
    else if (a === "--branch") cfg.branch = next();
    else if (a === "--worker-url") cfg.workerUrl = normalizeUrl(next());
    else if (a === "--page-url") cfg.pageUrl = normalizeUrl(next());
    else if (a === "--author") cfg.author = next();
    else if (a === "--dry-run") cfg.dryRun = true;
    else if (a === "-h" || a === "--help") usage(0);
    else throw new Error(`未知参数: ${a}`);
  }
  if (!cfg.repo) throw new Error("必须提供 --repo owner/repo 或 GitHub 仓库 URL");
  if (!cfg.pageUrl) cfg.pageUrl = cfg.workerUrl;
  return cfg;
}

function normalizeRepo(input) {
  let s = String(input || "").trim();
  s = s.replace(/^https?:\/\/github\.com\//i, "").replace(/^git@github\.com:/i, "");
  s = s.replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s)) {
    throw new Error(`仓库格式不正确: ${input}`);
  }
  return s;
}

function normalizeUrl(input) {
  const s = String(input || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  const u = new URL(s);
  if (u.protocol !== "https:") throw new Error("Worker/Page URL 必须使用 https");
  return u.toString().replace(/\/+$/, "");
}

function usage(code) {
  console.log(`用法:
  node scripts/configure-repo.mjs --repo owner/wloc --worker-url https://your-worker.workers.dev

可选:
  --page-url https://your-pages.pages.dev
  --branch main
  --author "你的名字"
  --dry-run
`);
  process.exit(code);
}

function applyConfig(text, cfg) {
  const raw = `https://raw.githubusercontent.com/${cfg.repo}/refs/heads/${cfg.branch}`;
  const github = `https://github.com/${cfg.repo}`;
  const clone = `${github}.git`;
  const deployUrl = `https://deploy.workers.cloudflare.com/?url=${github}/tree/${cfg.branch}/worker`;
  const pageUrl = cfg.pageUrl || "https://YOUR_WORKER_SUBDOMAIN.workers.dev";
  const workerUrl = cfg.workerUrl || "https://YOUR_WORKER_SUBDOMAIN.workers.dev";

  const replacements = [
    [/https:\/\/raw\.githubusercontent\.com\/Yu9191\/wloc\/refs\/heads\/main/g, raw],
    [/https:\/\/raw\.githubusercontent\.com\/YOUR_GITHUB_USERNAME\/wloc\/refs\/heads\/main/g, raw],
    [/https:\/\/github\.com\/Yu9191\/wloc(?!\/pull)/g, github],
    [/https:\/\/github\.com\/YOUR_GITHUB_USERNAME\/wloc/g, github],
    [/https:\/\/github\.com\/Yu9191\/wloc\.git/g, clone],
    [/git clone https:\/\/github\.com\/[^/\s]+\/wloc\.git/g, `git clone ${clone}`],
    [/https:\/\/deploy\.workers\.cloudflare\.com\/\?url=https:\/\/github\.com\/Yu9191\/wloc\/tree\/main\/worker/g, deployUrl],
    [/https:\/\/deploy\.workers\.cloudflare\.com\/\?url=https:\/\/github\.com\/YOUR_GITHUB_USERNAME\/wloc\/tree\/main\/worker/g, deployUrl],
    [/https:\/\/wloc-spoofer\.wloc\.workers\.dev/g, workerUrl],
    [/https:\/\/YOUR_WORKER_SUBDOMAIN\.workers\.dev/g, workerUrl],
    [/https:\/\/wloc-pages\.pages\.dev/g, pageUrl],
    [/https:\/\/YOUR_PAGES_PROJECT\.pages\.dev/g, pageUrl],
    [/#!author=Yu9191 Rewrite/g, `#!author=${cfg.author}`],
    [/author: Yu9191 Rewrite/g, `author: ${cfg.author}`],
  ];

  return replacements.reduce((acc, [from, to]) => acc.replace(from, to), text);
}

async function main() {
  let cfg;
  try {
    cfg = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    usage(1);
  }

  for (const file of files) {
    const p = path.join(root, file);
    const before = await readFile(p, "utf8");
    const after = applyConfig(before, cfg);
    if (before !== after) {
      console.log(`${cfg.dryRun ? "would update" : "updated"} ${file}`);
      if (!cfg.dryRun) await writeFile(p, after);
    }
  }
}

main().catch((e) => {
  console.error(e.stack || e.message || String(e));
  process.exit(1);
});
