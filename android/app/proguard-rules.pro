# -------------------------------
# Base: React Native / Hermes / TurboModules
# -------------------------------
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.proguard.annotations.DoNotStrip { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keepclasseswithmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# RN bridge / packages / ReactMethod (reflections)
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * implements com.facebook.react.ReactPackage { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# -------------------------------
# Reanimated
# -------------------------------
-keep class com.swmansion.reanimated.** { *; }

# -------------------------------
# Expo Modules
# -------------------------------
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# (Eski projelerde görülebilir)
-keep class host.exp.** { *; }
-dontwarn host.exp.**

# -------------------------------
# AndroidX / Parcelable / Annotations
# -------------------------------
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}
-keepattributes *Annotation*,InnerClasses,EnclosingMethod,Signature

# -------------------------------
# OkHttp / Okio (genellikle gerekmez ama güvenli)
# -------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**

# -------------------------------
# Gson (kullanıyorsan)
# -------------------------------
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.JsonSerializer { *; }
-keep class * implements com.google.gson.JsonDeserializer { *; }
-dontwarn com.google.gson.**

# -------------------------------
# Firebase (google-services ile çoğu rule otomatik gelir; yine de güvenli)
# -------------------------------
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }

# -------------------------------
# WorkManager / AndroidX (bildirim/scheduler kullanan kütüphaneler için güvenli)
# -------------------------------
-dontwarn androidx.work.**
-keep class androidx.work.** { *; }

# -------------------------------
# Misc: Kotlin / Coroutines (bazı lib'lerde yararlı)
# -------------------------------
-dontwarn kotlin.**
-dontwarn kotlinx.coroutines.**

# -------------------------------
# Eğer Crashlytics vs. kullanıyorsan (opsiyonel)
# -------------------------------
# -keep class com.google.firebase.crashlytics.** { *; }

# -------------------------------
# Varsayılan: Sıkılaştırma sonrası log vs. kaldırmak istersen (opsiyonel)
# -------------------------------
# -assumenosideeffects class android.util.Log {
#     public static *** d(...);
#     public static *** v(...);
#     public static *** i(...);
#     public static *** w(...);
# }

# -------------------------------
# Proje-özel ek kurallarını buraya koy
# -------------------------------