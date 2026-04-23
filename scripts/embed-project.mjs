#!/usr/bin/env node
/**
 * embed-project — The "Project-to-Post" Migrator
 *
 * Usage:  node scripts/embed-project.mjs
 * Flags:  --path <dir>   skip the interactive path prompt
 *         --slug <name>  skip the interactive slug prompt
 *         --dry-run      print what would happen without writing files
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import readline from "readline";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

// ─── helpers ────────────────────────────────────────────────────────────────

const BLOG_ROOT = path.resolve(import.meta.dirname, "..");
const POSTS_DIR = path.join(BLOG_ROOT, "posts");
const PUBLIC_DIR = path.join(BLOG_ROOT, "public", "posts");
const POST_CLIENT = path.join(BLOG_ROOT, "app", "posts", "[slug]", "post-client.tsx");

const ASSET_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico",
  ".mp4", ".webm", ".woff", ".woff2", ".ttf", ".otf", ".pdf",
]);

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function log(msg)  { process.stdout.write(`\x1b[36m[embed]\x1b[0m ${msg}\n`); }
function warn(msg) { process.stdout.write(`\x1b[33m[warn]\x1b[0m  ${msg}\n`); }
function ok(msg)   { process.stdout.write(`\x1b[32m[ok]\x1b[0m    ${msg}\n`); }
function err(msg)  { process.stdout.write(`\x1b[31m[err]\x1b[0m   ${msg}\n`); }

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function copyDir(src, dest, dryRun = false) {
  if (!dryRun) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".next", "dist", "build", "out"].includes(entry.name)) continue;
      copyDir(srcPath, destPath, dryRun);
    } else {
      if (!dryRun) fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── Step 1: Entry Point Detection ──────────────────────────────────────────

const ENTRY_CANDIDATES = [
  "src/App.tsx", "src/App.jsx",
  "src/main.tsx", "src/main.jsx",
  "App.tsx", "App.jsx",
  "index.tsx", "index.jsx",
  "src/index.tsx", "src/index.jsx",
];

function detectEntry(projectDir) {
  for (const candidate of ENTRY_CANDIDATES) {
    const abs = path.join(projectDir, candidate);
    if (fs.existsSync(abs)) return candidate;
  }
  return null;
}

// ─── Step 2: Import Path Audit ───────────────────────────────────────────────

function auditImports(projectDir, destDir, dryRun) {
  const tsxFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".git"].includes(entry.name)) walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        tsxFiles.push(full);
      }
    }
  }
  walk(destDir);

  const escapees = [];

  for (const file of tsxFiles) {
    let src = fs.readFileSync(file, "utf-8");
    let ast;
    try {
      ast = parse(src, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch {
      warn(`Could not parse ${path.relative(BLOG_ROOT, file)} — skipping import audit`);
      continue;
    }

    const fileDir = path.dirname(file);
    const relativeToDestRoot = path.relative(destDir, fileDir);
    const depthFromDestRoot = relativeToDestRoot.split(path.sep).filter(Boolean).length;

    // eslint-disable-next-line no-loop-func
    traverse.default(ast, {
      ImportDeclaration({ node }) {
        const src = node.source.value;
        if (!src.startsWith(".")) return; // node_modules — safe

        // Count how many levels up this import goes
        const upCount = src.split("/").filter((s) => s === "..").length;
        if (upCount > depthFromDestRoot) {
          escapees.push({
            file: path.relative(BLOG_ROOT, file),
            import: src,
            upCount,
            depthFromDestRoot,
          });
        }
      },
    });
  }

  return escapees;
}

// ─── Step 3: Dependency Merge ─────────────────────────────────────────────────

function mergeDeps(projectDir, dryRun) {
  const extPkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(extPkgPath)) return;

  const extPkg = JSON.parse(fs.readFileSync(extPkgPath, "utf-8"));
  const blogPkg = JSON.parse(fs.readFileSync(path.join(BLOG_ROOT, "package.json"), "utf-8"));

  const toAdd = [];
  const conflicts = [];

  for (const [name, version] of Object.entries({
    ...(extPkg.dependencies ?? {}),
    ...(extPkg.devDependencies ?? {}),
  })) {
    // Skip react, next, and typescript — already in blog
    if (["react", "react-dom", "next", "typescript"].includes(name)) continue;

    const existing = blogPkg.dependencies?.[name] ?? blogPkg.devDependencies?.[name];
    if (!existing) {
      toAdd.push(`${name}@${version.replace(/^[\^~]/, "")}`);
    } else if (existing !== version) {
      conflicts.push({ name, existing, incoming: version });
    }
  }

  if (conflicts.length > 0) {
    warn("Dependency version conflicts — NOT auto-merging these:");
    conflicts.forEach(({ name, existing, incoming }) => {
      warn(`  ${name}: blog has ${existing}, project wants ${incoming}`);
    });
    warn("Resolve manually after embed completes.");
  }

  if (toAdd.length > 0 && !dryRun) {
    log(`Installing ${toAdd.length} new dep(s): ${toAdd.join(", ")}`);
    execSync(`npm install ${toAdd.join(" ")}`, { cwd: BLOG_ROOT, stdio: "inherit" });
  } else if (toAdd.length > 0) {
    log(`[dry-run] Would install: ${toAdd.join(", ")}`);
  }
}

// ─── Step 4: page.tsx generation ─────────────────────────────────────────────

function generatePageTsx(slug, entryRelative) {
  const importPath = `@/posts/${slug}/${entryRelative.replace(/\.(tsx?|jsx?)$/, "")}`;
  return `"use client";
import { lazy, Suspense } from "react";
const ProjectRoot = lazy(() => import("${importPath}"));

export default function ${slug.replace(/-./g, (m) => m[1].toUpperCase()).replace(/^\w/, (c) => c.toUpperCase())}Post() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><span className="loader" /></div>}>
      <ProjectRoot />
    </Suspense>
  );
}
`;
}

// ─── Step 5: Asset rewrite ────────────────────────────────────────────────────

function rewriteAssets(destDir, slug, dryRun) {
  const assetSrc = path.join(destDir, "public");
  if (!fs.existsSync(assetSrc)) return;

  const assetDest = path.join(PUBLIC_DIR, slug);
  log(`Moving public assets → public/posts/${slug}/`);
  if (!dryRun) {
    fs.mkdirSync(assetDest, { recursive: true });
    copyDir(assetSrc, assetDest, dryRun);
    fs.rmSync(assetSrc, { recursive: true, force: true });
  }
}

// ─── Step 6: Register in post-client.tsx ─────────────────────────────────────

function registerInPostClient(slug, dryRun) {
  if (!fs.existsSync(POST_CLIENT)) {
    warn("post-client.tsx not found — skipping auto-registration. Add manually.");
    return;
  }

  const current = fs.readFileSync(POST_CLIENT, "utf-8");
  const marker = "// embed-project appends entries here automatically";
  const entry = `  ${slug}: lazy(() => import("@/posts/${slug}/index")),`;

  if (current.includes(entry)) {
    log("Already registered in post-client.tsx — skipping.");
    return;
  }

  const updated = current.replace(marker, `${entry}\n  ${marker}`);
  if (!dryRun) fs.writeFileSync(POST_CLIENT, updated, "utf-8");
  ok(`Registered "${slug}" in post-client.tsx`);
}

// ─── Step 7: metadata.json ────────────────────────────────────────────────────

function generateMetadata(slug, projectDir, dryRun) {
  const metaPath = path.join(POSTS_DIR, slug, "metadata.json");
  if (fs.existsSync(metaPath)) return; // already exists from a previous run

  let title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let description = "";

  const extPkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(extPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(extPkgPath, "utf-8"));
      if (pkg.name) title = pkg.name;
      if (pkg.description) description = pkg.description;
    } catch { /* ok */ }
  }

  const meta = {
    title,
    description,
    date: new Date().toISOString().split("T")[0],
    tags: [],
  };

  if (!dryRun) {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  }
  ok(`Generated metadata.json for "${slug}"`);
}

// ─── Step 8: Git operations ───────────────────────────────────────────────────

function gitPush(slug, dryRun) {
  if (dryRun) {
    log("[dry-run] Would stage, commit, and push:");
    log(`  git add posts/${slug}/ public/posts/${slug}/`);
    log(`  git commit -m "feat(posts): embed ${slug}"`);
    log(`  git push origin main`);
    return;
  }

  try {
    execSync(`git add posts/${slug}/ public/posts/${slug}/ app/posts/\\[slug\\]/post-client.tsx package.json package-lock.json 2>/dev/null || true`, {
      cwd: BLOG_ROOT,
      stdio: "inherit",
    });
    execSync(`git commit -m "feat(posts): embed ${slug}"`, { cwd: BLOG_ROOT, stdio: "inherit" });
    execSync(`git push origin main`, { cwd: BLOG_ROOT, stdio: "inherit" });
    ok("Pushed to main — GitHub Pages deploy triggered.");
  } catch (e) {
    warn(`Git operation failed: ${e.message}`);
    warn("Stage and push manually when ready.");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const pathArg = args[args.indexOf("--path") + 1];
  const slugArg = args[args.indexOf("--slug") + 1];

  if (dryRun) log("DRY RUN — no files will be written.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // ── Inputs ──
  let projectPath = pathArg
    ? path.resolve(pathArg.replace(/^~/, process.env.HOME ?? ""))
    : path.resolve((await ask(rl, "📂 Path to external project (e.g. ~/projects/cool-app): ")).trim().replace(/^~/, process.env.HOME ?? ""));

  if (!fs.existsSync(projectPath)) {
    err(`Path not found: ${projectPath}`);
    rl.close();
    process.exit(1);
  }

  let rawSlug = slugArg ?? (await ask(rl, "🏷  Slug name (e.g. animated-dashboard): ")).trim();
  const slug = slugify(rawSlug);
  if (!slug) {
    err("Slug cannot be empty.");
    rl.close();
    process.exit(1);
  }

  rl.close();

  const destDir = path.join(POSTS_DIR, slug);
  if (fs.existsSync(destDir)) {
    err(`posts/${slug}/ already exists. Choose a different slug or delete the folder first.`);
    process.exit(1);
  }

  log(`\nEmbedding "${path.basename(projectPath)}" → posts/${slug}/\n`);

  // ── Step 1: Copy ──
  log("Step 1/7 — Copying project files…");
  if (!dryRun) {
    copyDir(projectPath, destDir);
  }
  ok("Copied.");

  // ── Step 2: Entry detection ──
  log("Step 2/7 — Detecting entry point…");
  const entry = detectEntry(dryRun ? projectPath : destDir) ?? "index.tsx";
  ok(`Entry: ${entry}`);

  // ── Step 3: Import audit ──
  log("Step 3/7 — Auditing import paths for escapees…");
  if (!dryRun) {
    const escapees = auditImports(projectPath, destDir, dryRun);
    if (escapees.length === 0) {
      ok("No escaping imports found.");
    } else {
      warn(`Found ${escapees.length} import(s) that escape the post folder:`);
      escapees.forEach(({ file, import: imp }) => warn(`  ${file}: "${imp}"`));
      warn("These will break. Fix them manually or inline the referenced files.");
    }
  } else {
    log("[dry-run] Skipping import audit (no files copied).");
  }

  // ── Step 4: Deps ──
  log("Step 4/7 — Merging dependencies…");
  mergeDeps(projectPath, dryRun);
  ok("Dependencies merged.");

  // ── Step 5: Generate page wrapper ──
  log("Step 5/7 — Generating page wrapper (index.tsx)…");
  const indexDest = path.join(destDir, "index.tsx");
  // Only generate if the entry is not already index.tsx
  if (entry !== "index.tsx" && entry !== "./index.tsx") {
    const content = generatePageTsx(slug, entry);
    if (!dryRun) fs.writeFileSync(indexDest, content, "utf-8");
    ok(`Generated posts/${slug}/index.tsx → wraps ${entry}`);
  } else {
    ok("Entry is already index.tsx — no wrapper needed.");
  }

  // ── Step 6: Asset rewrite ──
  log("Step 6/7 — Handling public assets…");
  rewriteAssets(destDir, slug, dryRun);

  // ── Step 7: metadata + registration ──
  log("Step 7/7 — Generating metadata + registering route…");
  generateMetadata(slug, projectPath, dryRun);
  registerInPostClient(slug, dryRun);

  // ── Git ──
  const doGit = process.env.NO_GIT !== "1";
  if (doGit) {
    log("\nGit — staging, committing, pushing…");
    gitPush(slug, dryRun);
  }

  process.stdout.write(`\n\x1b[32m✓ Done!\x1b[0m posts/${slug}/ is ready.\n`);
  if (dryRun) process.stdout.write("Run without --dry-run to apply changes.\n");
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
