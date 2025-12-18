import AVFoundation
import Foundation
import React

@objc(TalkeeAudioRoute)
class TalkeeAudioRoute: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc func setSpeakerEnabled(
    _ enabled: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let session = AVAudioSession.sharedInstance()

    // Try the minimal override first (Twilio may already have configured the session).
    do {
      try session.overrideOutputAudioPort(enabled ? .speaker : .none)
      resolve(true)
      return
    } catch {
      // Fall through to a more defensive configuration.
    }

    do {
      // Ensure a category that supports both input and output and allows speaker override.
      // We avoid `defaultToSpeaker` so the "off" state can route back to the earpiece.
      if session.category != .playAndRecord {
        try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth])
      }

      if !session.isOtherAudioPlaying {
        // Activating should be safe during a call; Twilio typically keeps this active already.
        try session.setActive(true)
      }

      try session.overrideOutputAudioPort(enabled ? .speaker : .none)
      resolve(true)
    } catch let err {
      reject("AUDIO_ROUTE_ERROR", err.localizedDescription, err)
    }
  }

  @objc func getSpeakerEnabled(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let session = AVAudioSession.sharedInstance()
    let isSpeaker = session.currentRoute.outputs.contains { output in
      output.portType == .builtInSpeaker
    }
    resolve(isSpeaker)
  }
}
