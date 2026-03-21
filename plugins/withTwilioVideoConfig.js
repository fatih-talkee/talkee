const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withTwilioProguard = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardRulesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      
      try {
        let proguardRules = fs.readFileSync(proguardRulesPath, 'utf8');
        const twilioRules = `\n# Twilio Video & WebRTC Rules\n-keep class com.twilio.video.** { *; }\n-keep class tvi.webrtc.** { *; }\n-keep class org.webrtc.** { *; }\n-dontwarn com.twilio.video.**\n`;
        
        if (!proguardRules.includes('com.twilio.video')) {
          fs.writeFileSync(proguardRulesPath, proguardRules + twilioRules);
        }
      } catch (error) {
        console.warn('Failed to modify proguard-rules.pro for Twilio Video');
      }
      
      return config;
    },
  ]);
};

module.exports = function withTwilioVideoConfig(config) {
  // Add Android Proguard rules
  config = withTwilioProguard(config);
  return config;
};
