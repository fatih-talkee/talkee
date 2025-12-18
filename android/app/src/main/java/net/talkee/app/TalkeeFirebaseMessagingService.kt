package net.talkee.app

import android.os.PowerManager
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

/**
 * Single FirebaseMessagingService entry-point for the app.
 *
 * Why this exists:
 * - expo-notifications needs to receive FCM messages to deliver notifications (especially while app is foreground).
 * - Twilio Voice RN SDK also registers a FirebaseMessagingService for incoming call push payloads.
 * - On Android, only ONE service typically receives `com.google.firebase.MESSAGING_EVENT`.
 *
 * We route Twilio call payloads to the Twilio SDK, and everything else to expo-notifications.
 */
class TalkeeFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    // Twilio Voice expects data payloads for call invites.
    val data = remoteMessage.data

    try {
      Log.i(
        "TalkeeFCM",
        "onMessageReceived: from=${remoteMessage.from} messageId=${remoteMessage.messageId} " +
          "hasData=${data.isNotEmpty()} hasNotification=${remoteMessage.notification != null} dataKeys=${data.keys}"
      )
    } catch (_: Exception) {
      // ignore logging issues
    }

    if (data.isNotEmpty()) {
      // Mirror Twilio's wake-lock behavior for call invites.
      try {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        val isScreenOn = pm.isInteractive
        if (!isScreenOn) {
          val wl = pm.newWakeLock(
            PowerManager.SCREEN_DIM_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "TalkeeFirebaseMessagingService:notificationLock"
          )
          wl.acquire(30_000)
        }
      } catch (e: Exception) {
        // Not fatal
      }

      try {
        val handledByTwilio = tryHandleTwilioVoice(data)

        if (handledByTwilio) {
          Log.i("TalkeeFCM", "Message handled by Twilio Voice (call payload).")
          // Twilio payload consumed (incoming call / cancelled call, etc.)
          return
        }
        Log.w("TalkeeFCM", "Message NOT handled by Twilio (forwarding to Expo).")
      } catch (e: Exception) {
        Log.e("TalkeeFCM", "Twilio handleMessage error", e)
        // Fall through to Expo handler
      }
    }

    // Non-Twilio messages (including Expo push notifications) should be handled by expo-notifications.
    Log.i("TalkeeFCM", "Forwarding message to expo-notifications handler.")
    super.onMessageReceived(remoteMessage)
  }

  override fun onNewToken(token: String) {
    Log.i("TalkeeFCM", "onNewToken received (length=${token.length})")
    // Let expo-notifications handle any internal bookkeeping.
    super.onNewToken(token)
  }

  /**
   * Avoid direct compile-time dependency on `com.twilio:voice-android` which is pulled in by the
   * Twilio RN module as `implementation` (not exposed to the app module).
   */
  private fun tryHandleTwilioVoice(data: Map<String, String>): Boolean {
    return try {
      val voiceClass = Class.forName("com.twilio.voice.Voice")

      // handleMessage(Context, Map<String,String>, MessageListener, CallMessageListener)
      val handleMessageMethod = voiceClass.methods.firstOrNull { m ->
        m.name == "handleMessage" && m.parameterTypes.size == 4
      } ?: return false

      val messageHandler =
        Class.forName("com.twiliovoicereactnative.VoiceFirebaseMessagingService\$MessageHandler")
          .getDeclaredConstructor()
          .newInstance()

      val callMessageListenerProxy =
        Class.forName("com.twiliovoicereactnative.CallMessageListenerProxy")
          .getDeclaredConstructor()
          .newInstance()

      val result = handleMessageMethod.invoke(
        null,
        this,
        data,
        messageHandler,
        callMessageListenerProxy
      )

      (result as? Boolean) ?: false
    } catch (e: Throwable) {
      Log.e("TalkeeFCM", "Reflection Twilio Voice handleMessage failed", e)
      false
    }
  }
}


