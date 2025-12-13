// metro.config.js — Expo projeleri için
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Get the default config
const config = getDefaultConfig(__dirname);

// ✅ Enable require.context for expo-router
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// ✅ Also enable in transform variants if they exist
if (config.transformer.transformVariants) {
  Object.keys(config.transformer.transformVariants).forEach((variant) => {
    config.transformer.transformVariants[variant] = {
      ...config.transformer.transformVariants[variant],
      unstable_allowRequireContext: true,
    };
  });
}

// Debug logs
console.log(
  '[Metro Config] ✅ unstable_allowRequireContext enabled:',
  config.transformer.unstable_allowRequireContext
);

// ✅ Fix for "missing-asset-registry-path" error on web
const projectRoot = __dirname;
const shimPath = path.resolve(
  projectRoot,
  'node_modules/missing-asset-registry-path'
);

// Initialize resolver if not exists
if (!config.resolver) {
  config.resolver = {};
}

// Add extra node modules
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'missing-asset-registry-path': shimPath,
};

// ✅ Fix for Stripe React Native on web (native-only module)
// Create web mock file for Stripe
const stripeMockDir = path.resolve(projectRoot, 'lib', 'mocks');
const stripeMockFile = path.join(stripeMockDir, 'stripe-web-mock.js');

// Create mock directory if it doesn't exist
if (!fs.existsSync(stripeMockDir)) {
  fs.mkdirSync(stripeMockDir, { recursive: true });
}

// Create mock file if it doesn't exist
if (!fs.existsSync(stripeMockFile)) {
  fs.writeFileSync(
    stripeMockFile,
    `// Web mock for @stripe/stripe-react-native (native-only)
// This file is used when building for web platform
module.exports = {
  useStripe: () => null,
  useApplePay: () => null,
  useGooglePay: () => null,
  initPaymentSheet: () => Promise.resolve({ error: null }),
  presentPaymentSheet: () => Promise.resolve({ error: null }),
  confirmPayment: () => Promise.resolve({ error: null }),
  createPaymentMethod: () => Promise.resolve({ error: null }),
  retrievePaymentIntent: () => Promise.resolve({ error: null }),
  handleURLCallback: () => Promise.resolve(false),
  isPlatformPaySupported: () => Promise.resolve(false),
};
`
  );
}

// ✅ Custom resolver for missing-asset-registry-path and Stripe
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle missing-asset-registry-path
  if (moduleName === 'missing-asset-registry-path') {
    const modulePath = path.join(shimPath, 'index.js');
    return {
      type: 'sourceFile',
      filePath: modulePath,
    };
  }

  // Handle Stripe React Native on web (return mock)
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return {
      type: 'sourceFile',
      filePath: stripeMockFile,
    };
  }

  // Use original resolver if exists
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  // Fallback to context's default resolver
  return context.resolveRequest(context, moduleName, platform);
};

// ✅ Export config directly (not async)
module.exports = config;
