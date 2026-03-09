const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace-level shared/ directory for locales
config.watchFolders = [path.resolve(workspaceRoot, 'shared')];

module.exports = config;
