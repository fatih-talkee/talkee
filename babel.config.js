// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: { '@': './', '@app': './app', '@components': './components' },
        },
      ],
      // her zaman en sonda:
      'react-native-reanimated/plugin',
    ],
  };
};
