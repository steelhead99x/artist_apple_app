// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure transformer to handle TypeScript properly
config.transformer = config.transformer || {};
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Configure resolver - ensure TypeScript files are included in source extensions
config.resolver = config.resolver || {};
// The default config already includes ts/tsx, but we ensure they're there
if (!config.resolver.sourceExts.includes('ts')) {
  config.resolver.sourceExts.push('ts');
}
if (!config.resolver.sourceExts.includes('tsx')) {
  config.resolver.sourceExts.push('tsx');
}

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
  
  // Handle relative imports for ts-declarations in expo-modules-core
  // This fixes the issue where ../ts-declarations/global can't be resolved
  if (moduleName.includes('ts-declarations') && context.originModulePath) {
    const originDir = path.dirname(context.originModulePath);
    const resolvedPath = path.resolve(originDir, moduleName);
    
    // Try with .ts extension first
    const tsPath = resolvedPath + '.ts';
    if (fs.existsSync(tsPath)) {
      return {
        filePath: tsPath,
        type: 'sourceFile',
      };
    }
    
    // Try without extension (directory/index)
    if (fs.existsSync(resolvedPath + '.ts')) {
      return {
        filePath: resolvedPath + '.ts',
        type: 'sourceFile',
      };
    }
  }
  
  // Use default resolution for all other modules
  if (defaultResolver) {
    try {
      return defaultResolver(context, moduleName, platform);
    } catch (e) {
      // If default resolver fails and it's a relative import, try manual resolution
      if (moduleName.startsWith('.') && context.originModulePath) {
        const originDir = path.dirname(context.originModulePath);
        const resolvedPath = path.resolve(originDir, moduleName);
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        
        for (const ext of extensions) {
          const filePath = resolvedPath + ext;
          if (fs.existsSync(filePath)) {
            return {
              filePath: filePath,
              type: 'sourceFile',
            };
          }
        }
      }
      throw e;
    }
  }
  
  // Fallback if no default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

