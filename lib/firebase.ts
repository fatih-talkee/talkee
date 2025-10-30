import Constants from 'expo-constants';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';

let firebaseApp: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;

  const config = (Constants.expoConfig?.extra as any)?.firebase;
  if (!config || !config.apiKey) {
    console.warn(
      'Firebase config is missing. Fill expo.extra.firebase in app.json.'
    );
  }

  firebaseApp = getApps().length ? getApp() : initializeApp(config);
  return firebaseApp;
}
