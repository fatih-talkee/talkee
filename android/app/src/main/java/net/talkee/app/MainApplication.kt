package net.talkee.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.bridge.JSBundleLoader
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
            // Exclude Twilio Voice package until it's properly initialized
            // Remove this filter when Twilio Voice is ready to use
            val filteredPackages = packages.filterNot { 
              it.javaClass.name.contains("TwilioVoice")
            }
            return filteredPackages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"
          
          // Disable developer support to use bundled assets instead of Metro
          // Set to true if you want to use Metro bundler (requires device and computer on same network)
          override fun getUseDeveloperSupport(): Boolean = false
          
          // Return null so React Native uses getBundleAssetName() instead, which loads from assets
          override fun getJSBundleFile(): String? {
            return null
          }
          
          // Override to use Expo's bundled asset path
          // React Native uses this when getJSBundleFile() returns null
          override fun getBundleAssetName(): String {
            // Expo exports bundles to _expo/static/js/android/entry-{hash}.hbc in assets
            // Read from metadata.json to get the correct bundle path
            try {
              val inputStream = applicationContext.assets.open("metadata.json")
              val json = inputStream.bufferedReader().use { it.readText() }
              val jsonObject = org.json.JSONObject(json)
              val bundlePath = jsonObject
                .getJSONObject("fileMetadata")
                .getJSONObject("android")
                .getString("bundle")
              // Return the asset path - React Native will load this from assets
              return bundlePath
            } catch (e: Exception) {
              android.util.Log.e("MainApplication", "Failed to load bundle path from metadata.json", e)
              // Fallback to default bundle name
              return "index.android.bundle"
            }
          }

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    
    // Note: Twilio Voice SDK is excluded from packages until proper initialization is implemented
    // When ready to use Twilio Voice, remove the filter in getPackages() and add proper initialization
    
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
