// metro.config.js  — Expo projeleri için
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  // İstersen burada resolver/transformer özelleştirmeleri yapabilirsin
  return config;
})();
