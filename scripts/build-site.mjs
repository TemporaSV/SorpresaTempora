import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const siteDir = path.join(workspaceRoot, "site");
const assetsSourceDir = path.join(workspaceRoot, "assets");
const assetsTargetDir = path.join(siteDir, "assets");

const filesToCopy = [
  "index.html",
  "admin.html",
  "styles.css",
  "app.js",
  "admin.js",
  "supabase-client.js",
];

function ensureCleanDir(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyFile(relativePath) {
  const sourcePath = path.join(workspaceRoot, relativePath);
  const targetPath = path.join(siteDir, relativePath);
  fs.copyFileSync(sourcePath, targetPath);
}

function copyDirRecursive(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function replaceConfigLiteral(source, key, value) {
  if (!value) {
    return source;
  }

  const pattern = new RegExp(`(${key}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  return source.replace(pattern, `$1${JSON.stringify(value)}`);
}

function buildRuntimeConfig() {
  const configPath = path.join(workspaceRoot, "config.js");
  let configSource = fs.readFileSync(configPath, "utf8");

  const publicUrl = process.env.PUBLIC_SUPABASE_URL || "";
  const publishableKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || "";
  const functionName = process.env.PUBLIC_NOTIFICATION_FUNCTION_NAME || "";

  if (!publicUrl) {
    throw new Error("Missing PUBLIC_SUPABASE_URL for GitHub Pages build.");
  }

  if (!publishableKey && !anonKey) {
    throw new Error(
      "Missing PUBLIC_SUPABASE_PUBLISHABLE_KEY or PUBLIC_SUPABASE_ANON_KEY for GitHub Pages build.",
    );
  }

  configSource = replaceConfigLiteral(configSource, "supabaseUrl", publicUrl);
  configSource = replaceConfigLiteral(configSource, "supabasePublishableKey", publishableKey);
  configSource = replaceConfigLiteral(configSource, "supabaseAnonKey", anonKey);
  configSource = replaceConfigLiteral(
    configSource,
    "notificationFunctionName",
    functionName || "send-claim-email",
  );

  fs.writeFileSync(path.join(siteDir, "config.js"), configSource, "utf8");
}

ensureCleanDir(siteDir);

for (const file of filesToCopy) {
  copyFile(file);
}

copyDirRecursive(assetsSourceDir, assetsTargetDir);
buildRuntimeConfig();

console.log("GitHub Pages artifact created in ./site");
