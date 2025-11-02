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

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {

      override fun getPackages(): List<ReactPackage> {
        val packages = PackageList(this).packages
        // TwilioVoice hazır olana kadar dışla (istersen kaldır)
        return packages.filter { !it.javaClass.name.contains("TwilioVoice") }
      }

      // 🔹 Debug’ta Metro/Expo Dev Client sanal girişini kullan,
      // 🔹 Release’te klasik "index" (CI/CD’de RN bundling veya expo export:embed ile uyumlu)
      override fun getJSMainModuleName(): String =
        if (BuildConfig.DEBUG) ".expo/.virtual-metro-entry" else "index"

      // 🔹 EN ÖNEMLİ DÜZELTME: Debug'ta Metro'ya bağlanmak için true
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // RN 0.79 template’e uygun SoLoader init
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}