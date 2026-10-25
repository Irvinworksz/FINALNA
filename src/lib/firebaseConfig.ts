/// <reference types="vite/client" />

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  storageBucket: string;
  apiKey: string;
  authDomain: string;
  messagingSenderId: string;
  firestoreDatabaseId: string;
  oAuthClientId: string;
  [key: string]: any;
}

export const fallbackFirebaseConfig: FirebaseAppConfig = {
  projectId: 'favorable-outlook-98chg',
  appId: '1:1080932597738:web:06c4a47766eab88df87c93',
  storageBucket: 'favorable-outlook-98chg.firebasestorage.app',
  apiKey: 'AIzaSyB33KSNI3o-9A5m9G-DPT8FO7PwRpqAGbk',
  authDomain: 'favorable-outlook-98chg.firebaseapp.com',
  messagingSenderId: '1080932597738',
  firestoreDatabaseId: 'ai-studio-securebarangayec-e1ce6f07-2475-4656-8ed0-42c844f0e436',
  oAuthClientId: '1080932597738-t701ebclpnkotgacrottqrdsla178k8u.apps.googleusercontent.com'
};

const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true }) as Record<string, { default: any }>;
const rawConfig = configModules['../../firebase-applet-config.json']?.default || {};

export const firebaseConfig: FirebaseAppConfig = {
  ...fallbackFirebaseConfig,
  ...(rawConfig || {})
};

export default firebaseConfig;
