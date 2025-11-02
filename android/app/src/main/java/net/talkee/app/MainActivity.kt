package net.talkee.app

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper
import expo.modules.splashscreen.SplashScreenManager

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // ⚙️ Splash Screen kurulumu (expo-splash-screen tarafından yönetiliyor)
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }

  // 🔹 JS tarafında register edilen ana bileşen adı
  override fun getMainComponentName(): String = "main"

  // 🔹 ReactActivityDelegate yapılandırması (New Architecture kontrolü)
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled
      ) {}
    )
  }

  // 🔹 Android 12 (S) ile uyumlu geri tuşu davranışı
  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        super.invokeDefaultOnBackPressed()
      }
      return
    }
    super.invokeDefaultOnBackPressed()
  }
}