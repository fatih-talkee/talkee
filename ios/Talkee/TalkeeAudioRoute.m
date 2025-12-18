#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TalkeeAudioRoute, NSObject)

RCT_EXTERN_METHOD(setSpeakerEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSpeakerEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
