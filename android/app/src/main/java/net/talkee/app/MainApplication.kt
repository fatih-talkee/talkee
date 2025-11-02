package net.talkee.app

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

// Twilio Voice RN
import com.twiliovoicereactnative.VoiceApplicationProxy
// Eğer autolink kaçarsa aşağıdakini aktifleştirip getPackages()’e ekleyebilirsin
// import com.twiliovoicereactnative.TwilioVoiceReactNativePackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> {
        val packages = PackageList(this).packages
        // Autolink kaçarsa manuel ekleyin:
        // packages.add(TwilioVoiceReactNativePackage())
        return packages
      }

      // Expo dev client giriş noktası
      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // Yeni mimari açıksa native entry point’i yükle
      load()
    }

    // Expo modülleri lifecycle köprüsü
    ApplicationLifecycleDispatcher.onApplicationCreate(this)

    // Twilio Voice — uygulama başında initialize
    VoiceApplicationProxy.initialize(this)

    // Bazı sürümlerde lifecycle callback öneriliyor:
    // registerActivityLifecycleCallbacks(VoiceApplicationProxy.getActivityLifecycleCallbacks())
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}