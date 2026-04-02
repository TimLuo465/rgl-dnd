const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "build-sync.config.json");

const DEFAULT_CONFIG = {
  enabled: false,
  sourceDir: "dist",
  targetDir: "",
  cleanTargetBeforeCopy: true,
};

async function exists(targetPath) {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyRecursive(sourcePath, targetPath) {
  const stat = await fs.promises.lstat(sourcePath);

  if (stat.isDirectory()) {
    await fs.promises.mkdir(targetPath, { recursive: true });
    const entries = await fs.promises.readdir(sourcePath, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      await copyRecursive(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name)
      );
    }
    return;
  }

  if (stat.isSymbolicLink()) {
    const linkTarget = await fs.promises.readlink(sourcePath);
    if (await exists(targetPath)) {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    }
    await fs.promises.symlink(linkTarget, targetPath);
    return;
  }

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.copyFile(sourcePath, targetPath);
}

function resolveDir(dirPath) {
  if (!dirPath || typeof dirPath !== "string") {
    return "";
  }
  return path.isAbsolute(dirPath)
    ? path.normalize(dirPath)
    : path.resolve(PROJECT_ROOT, dirPath);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      "Missing build-sync.config.json. Please create it in project root."
    );
  }

  const configFileContent = fs.readFileSync(CONFIG_PATH, "utf8");
  const userConfig = JSON.parse(configFileContent);
  return { ...DEFAULT_CONFIG, ...userConfig };
}

async function run() {
  const config = loadConfig();

  if (!config.enabled) {
    console.log("[postbuild-sync] skipped (enabled=false)");
    return;
  }

  if (!config.targetDir || typeof config.targetDir !== "string") {
    throw new Error(
      "[postbuild-sync] `targetDir` is required when enabled=true."
    );
  }

  const sourceDir = resolveDir(config.sourceDir);
  const targetDir = resolveDir(config.targetDir);

  if (!(await exists(sourceDir))) {
    throw new Error(
      `[postbuild-sync] sourceDir does not exist: ${sourceDir}. Build may have failed.`
    );
  }

  if (config.cleanTargetBeforeCopy) {
    await fs.promises.rm(targetDir, { recursive: true, force: true });
  }
  await fs.promises.mkdir(targetDir, { recursive: true });
  await copyRecursive(sourceDir, targetDir);

  console.log(
    `[postbuild-sync] done. copied from "${sourceDir}" to "${targetDir}"`
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
