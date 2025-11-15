// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Store the default resolveRequest
const defaultResolver = config.resolver.resolveRequest;

// Ensure proper module resolution for web platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle fbjs/lib/* imports
  if (moduleName.startsWith('fbjs/lib/')) {
    try {
      return {
        filePath: require.resolve(moduleName),
        type: 'sourceFile',
      };
    } catch (e) {
      // Fall back to default resolver if require.resolve fails
    }
  }
  // Use default resolution for other modules
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  // Fallback if no default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

