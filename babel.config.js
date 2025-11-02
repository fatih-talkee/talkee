module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router için zorunlu
      'expo-router/babel',
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: { '@': './' },
        },
      ],
      // Reanimated mutlaka en sonda olmalı
      'react-native-reanimated/plugin',
    ],
  };
};
