const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// pnpm workspace root (two levels up from artifacts/mobile)
const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Watch workspace root so pnpm hoisted modules are found
config.watchFolders = [workspaceRoot];

// Resolve modules from project first, then workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Ensure Metro resolves from project root, not workspace root
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
