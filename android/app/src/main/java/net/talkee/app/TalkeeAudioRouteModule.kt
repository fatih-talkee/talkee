package net.talkee.app

import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TalkeeAudioRouteModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TalkeeAudioRoute"

  @ReactMethod
  fun setSpeakerEnabled(enabled: Boolean, promise: Promise) {
    try {
      val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
      audioManager.isSpeakerphoneOn = enabled
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("AUDIO_ROUTE_ERROR", e)
    }
  }

  @ReactMethod
  fun getSpeakerEnabled(promise: Promise) {
    try {
      val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      promise.resolve(audioManager.isSpeakerphoneOn)
    } catch (e: Exception) {
      promise.reject("AUDIO_ROUTE_ERROR", e)
    }
  }
}


