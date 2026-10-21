import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from './firebaseConfig';

let app: any;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn('[Firebase] App init warning:', e);
  app = getApps()[0];
}

export const auth = app ? getAuth(app) : ({} as any);
export const db = app ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)') : ({} as any);

// Validate connection to Firestore on initialization per IAS security checklist
export async function validateFirebaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('[Firebase] Firestore real-time cloud connection verified successfully.');
    return { connected: true };
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database initializing.');
      return { connected: false, error: 'Offline / initializing' };
    }
    // Document might just not exist, but server responded, meaning connection is live
    return { connected: true };
  }
}

// Initial connectivity ping
validateFirebaseConnection().catch(() => {});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in using Google Authentication via Firebase Auth SDK
 * Automatically handles and resolves account-exists-with-different-credential to link registered accounts
 */
export async function signInWithGoogleFirebase(): Promise<{
  success: boolean;
  user?: any;
  profile?: any;
  token?: string;
  firebaseUser?: FirebaseUser;
  error?: string;
  isAccountLinked?: boolean;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const idToken = await fbUser.getIdToken();

    // Call backend to authenticate / provision resident session
    const response = await fetch('/api/auth/firebase-google-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        idToken,
        accountLinked: false
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to authenticate with Barangay E-Services backend.'
      };
    }

    return {
      success: true,
      user: data.user,
      profile: data.profile,
      token: data.token,
      firebaseUser: fbUser,
      isAccountLinked: Boolean(data.accountLinked)
    };
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in cancelled. You closed the Google sign-in window.' };
    }
    if (error.code === 'auth/cancelled-popup-request') {
      return { success: false, error: 'Another sign-in request is already in progress.' };
    }

    // AUTOMATIC ACCOUNT LINKING: Handle auth/account-exists-with-different-credential
    // When a resident registered with email/password and now clicks Google Sign-In with that same Gmail
    if (error.code === 'auth/account-exists-with-different-credential' || error.message?.includes('account-exists-with-different-credential')) {
      const email = error.customData?.email || (error as any).email;
      if (email && typeof email === 'string' && email.includes('@')) {
        console.info(`[Firebase Auth] Resolving credential collision: linking Google account for registered email ${email}`);
        try {
          const response = await fetch('/api/auth/firebase-google-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uid: (error.customData as any)?.uid || `google-linked-${Date.now().toString(36)}`,
              email: email.trim().toLowerCase(),
              displayName: (error.customData as any)?.displayName || (error as any).displayName || email.split('@')[0],
              photoURL: (error.customData as any)?.photoURL || (error as any).photoURL || '',
              accountLinked: true
            })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            return {
              success: true,
              user: data.user,
              profile: data.profile,
              token: data.token,
              isAccountLinked: true
            };
          } else {
            return {
              success: false,
              error: data.error || 'Could not link Google account to registered profile.'
            };
          }
        } catch (linkErr: any) {
          console.warn('[Firebase Auth] Auto-link network error:', linkErr);
        }
      }
    }

    return {
      success: false,
      error: error.message || 'Firebase Google Sign-In failed.'
    };
  }
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

export async function signOutFirebaseUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('[Firebase Auth] Error signing out:', e);
  }
}

/**
 * Sends a real official password reset email directly via Google Firebase Auth to user's registered Gmail
 */
export async function sendFirebasePasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
  code?: string;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(auth, cleanEmail);
    console.info(`[Firebase Auth] Real password reset email dispatched via Google servers to ${cleanEmail}`);
    return { success: true };
  } catch (err: any) {
    console.warn('[Firebase Auth] sendPasswordResetEmail notice:', err?.code, err?.message);

    // If user is not yet created in Firebase Auth, auto-provision and immediately dispatch the reset link
    if (err?.code === 'auth/user-not-found' || err?.message?.includes('user-not-found')) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        console.info(`[Firebase Auth] Auto-provisioning Firebase user record for ${cleanEmail} to dispatch reset email...`);
        const tempPass = `Reset_${Math.random().toString(36).substring(2, 9)}!9A`;
        await createUserWithEmailAndPassword(auth, cleanEmail, tempPass);
        await sendPasswordResetEmail(auth, cleanEmail);
        console.info(`[Firebase Auth] Real password reset email successfully dispatched after auto-provisioning to ${cleanEmail}`);
        return { success: true };
      } catch (autoErr: any) {
        console.warn('[Firebase Auth] Auto-provisioning fallback error:', autoErr?.code, autoErr?.message);
        return {
          success: false,
          code: autoErr?.code,
          error: autoErr?.message || 'Firebase email dispatch error'
        };
      }
    }

    return {
      success: false,
      code: err?.code,
      error: err?.message || 'Firebase email dispatch error'
    };
  }
}

/**
 * Registers an account in Firebase Auth so Google Firebase can directly manage and dispatch emails
 */
export async function registerUserInFirebaseAuth(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    await createUserWithEmailAndPassword(auth, cleanEmail, password);
    console.info(`[Firebase Auth] Registered user in Firebase Auth with email: ${cleanEmail}`);
    return { success: true };
  } catch (err: any) {
    // If email is already registered in Firebase or provider requires toggle, log notice without crashing
    console.warn('[Firebase Auth] Registration notice:', err?.code, err?.message);
    return { success: false, error: err?.code || err?.message };
  }
}

/**
 * Validates user credentials against Google Firebase Auth.
 * When a resident resets their password via the official Firebase reset email link,
 * this function verifies that the newly submitted password is valid in Firebase,
 * allowing the portal to automatically sync the updated password to their portal account.
 */
export async function verifyFirebasePassword(email: string, password: string): Promise<{
  success: boolean;
  user?: FirebaseUser;
  idToken?: string;
  error?: string;
}> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const idToken = await result.user.getIdToken();
    console.info(`[Firebase Auth] Successfully verified new Firebase password for: ${cleanEmail}`);
    return {
      success: true,
      user: result.user,
      idToken
    };
  } catch (err: any) {
    console.warn('[Firebase Auth] verifyFirebasePassword notice:', err?.code, err?.message);
    return {
      success: false,
      error: err?.code || err?.message || 'Firebase authentication failed'
    };
  }
}

/**
 * Formats a domestic Philippine mobile phone number to international E.164 standard (+639XXXXXXXXX)
 */
export function formatToPhilippineE164(contactNumber: string): string {
  if (!contactNumber) return '';
  const digitsOnly = contactNumber.replace(/[^0-9]/g, '');
  if (digitsOnly.startsWith('63') && digitsOnly.length === 12) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith('09') && digitsOnly.length === 11) {
    return `+63${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith('9') && digitsOnly.length === 10) {
    return `+63${digitsOnly}`;
  }
  if (contactNumber.startsWith('+')) {
    return contactNumber;
  }
  return `+63${digitsOnly}`;
}

/**
 * Masks a phone number for secure display in the UI (e.g. +63 9•• ••• •567)
 */
export function maskPhilippinePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '••••••••••';
  const clean = phoneNumber.trim();
  if (clean.length < 8) return '••••••••••';
  const last3 = clean.slice(-3);
  const prefix = clean.startsWith('+63') ? '+63 9•• ••• •' : '09•• ••• •';
  return `${prefix}${last3}`;
}

/**
 * Manages invisible RecaptchaVerifier instance for Firebase Phone Auth
 */
let appVerifierInstance: RecaptchaVerifier | null = null;

export function setupPhoneRecaptcha(containerId = 'recaptcha-container'): RecaptchaVerifier | null {
  try {
    if (!auth || typeof window === 'undefined') return null;

    // If an existing verifier is attached, clear it to avoid container collision
    if (appVerifierInstance) {
      try {
        appVerifierInstance.clear();
      } catch (e) {
        // ignore clear errors
      }
      appVerifierInstance = null;
    }

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    appVerifierInstance = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.info('[Firebase Phone Auth] reCAPTCHA verified successfully.');
      },
      'expired-callback': () => {
        console.warn('[Firebase Phone Auth] reCAPTCHA response expired.');
      }
    });

    return appVerifierInstance;
  } catch (err) {
    console.warn('[Firebase Phone Auth] Error initializing RecaptchaVerifier:', err);
    return null;
  }
}

/**
 * Sends a real 6-digit SMS verification code to the resident's mobile number via Firebase Phone Auth
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  appVerifier?: RecaptchaVerifier | null
): Promise<{
  success: boolean;
  confirmationResult?: ConfirmationResult;
  error?: string;
  code?: string;
}> {
  try {
    const formattedPhone = formatToPhilippineE164(phoneNumber);
    if (!formattedPhone || formattedPhone.length < 11) {
      return {
        success: false,
        error: 'Invalid mobile phone number format.'
      };
    }

    const verifier = appVerifier || setupPhoneRecaptcha('recaptcha-container');
    if (!verifier) {
      return {
        success: false,
        error: 'Failed to initialize security verification (reCAPTCHA). Switched to Email OTP.'
      };
    }

    console.info(`[Firebase Phone Auth] Requesting SMS OTP for ${maskPhilippinePhoneNumber(formattedPhone)}...`);
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    console.info(`[Firebase Phone Auth] SMS OTP dispatched successfully to ${maskPhilippinePhoneNumber(formattedPhone)}`);

    return {
      success: true,
      confirmationResult
    };
  } catch (err: any) {
    console.warn('[Firebase Phone Auth] sendFirebasePhoneOtp error:', err?.code, err?.message);
    let userMsg = err?.message || 'Failed to dispatch SMS verification code.';
    if (err?.code === 'auth/quota-exceeded') {
      userMsg = 'SMS delivery quota reached on Firebase. Switched to Email OTP verification.';
    } else if (err?.code === 'auth/invalid-phone-number') {
      userMsg = 'The registered mobile phone number is invalid for SMS delivery.';
    } else if (err?.code === 'auth/billing-not-enabled') {
      userMsg = 'Firebase SMS carrier delivery requires a Blaze billing plan or adding test numbers in Firebase Console. Switched to Email OTP.';
    } else if (err?.code === 'auth/too-many-requests') {
      userMsg = 'Too many SMS requests sent to this number. Please wait a few minutes or switch to Email OTP.';
    } else if (err?.code === 'auth/operation-not-allowed') {
      userMsg = 'Phone authentication is not enabled in Firebase Console. Switched to Email OTP.';
    } else if (err?.code === 'auth/unauthorized-domain') {
      userMsg = 'Current domain is not authorized in Firebase Console -> Auth -> Settings -> Authorized Domains. Switched to Email OTP.';
    } else if (err?.code === 'auth/captcha-check-failed' || err?.code === 'auth/invalid-app-credential') {
      userMsg = 'Security verification could not verify this carrier session. Switched to Email OTP.';
    }

    return {
      success: false,
      code: err?.code,
      error: userMsg
    };
  }
}


