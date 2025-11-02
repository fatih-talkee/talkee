module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router için zorunlu
      'expo-router/babel',

      // Reanimated mutlaka en sonda olmalı
      'react-native-reanimated/plugin',
    ],
  };
};
