// react-native.config.js
module.exports = {
  dependencies: {
    // (Var olan) Reanimated autolinking kapatma
    'react-native-reanimated': {
      platforms: { android: null },
    },

    // (Yeni) Twilio Voice autolinking kapatma — sadece Android
    'twilio-voice-react-native': {
      platforms: { android: null },
    },
  },
};
