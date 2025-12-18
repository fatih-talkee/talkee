package net.talkee.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import com.stripe.android.PaymentConfiguration
import net.talkee.app.BuildConfig

class MainApplication : Application(), ReactApplication {

  // Initialize Twilio Voice SDK (optional - only if SDK is available)
  private var voiceApplicationProxy: Any? = null
  
  init {
    try {
      val voiceProxyClass = Class.forName("com.twiliovoicereactnative.VoiceApplicationProxy")
      voiceApplicationProxy = voiceProxyClass.getConstructor(Application::class.java).newInstance(this)
    } catch (e: Exception) {
      // Twilio SDK not available or not initialized - app will work without it
      android.util.Log.w("MainApplication", "Twilio Voice SDK not available: ${e.message}")
    }
  }

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(TalkeeAudioRoutePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    
    // Initialize Twilio Voice SDK (MUST be before loadReactNative, if available)
    try {
      voiceApplicationProxy?.javaClass?.getMethod("onCreate")?.invoke(voiceApplicationProxy)
    } catch (e: Exception) {
      // Twilio SDK not available - continue without it
      android.util.Log.w("MainApplication", "Twilio Voice SDK onCreate failed: ${e.message}")
    }
    
    // Initialize Stripe PaymentConfiguration
    val stripePublishableKey = BuildConfig.STRIPE_PUBLISHABLE_KEY
    if (stripePublishableKey.isNotEmpty()) {
      PaymentConfiguration.init(applicationContext, stripePublishableKey)
    }
    
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onTerminate() {
    try {
      voiceApplicationProxy?.javaClass?.getMethod("onTerminate")?.invoke(voiceApplicationProxy)
    } catch (e: Exception) {
      // Twilio SDK not available - continue without it
      android.util.Log.w("MainApplication", "Twilio Voice SDK onTerminate failed: ${e.message}")
    }
    super.onTerminate()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
