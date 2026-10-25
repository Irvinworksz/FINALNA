# Firebase Official Email Link 2FA Sign-In Plan

Deliver real Two-Factor Authentication emails directly to your registered Gmail (`carinok92@gmail.com`) using **Firebase Authentication's Official Email Link Service**—the exact same Google mail infrastructure that delivers your password reset emails.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed with you during the interview phase and are prioritized in this implementation:

- **Confirmed Delivery Mode**: **Use Firebase official email sign-in link like password reset**. Instead of relying on Nodemailer SMTP (which required a 16-character Google App Password), the portal will call Google's native Firebase Auth email service (`sendSignInLinkToEmail`). Google's own mail servers will deliver the official email directly to your Gmail inbox.
- **Confirmed Target Address**: **Sent directly to your registered Gmail address** (`carinok92@gmail.com` or your registered resident email).
- **Zero Configuration Burden**: No SMTP setup, no App Password, and no mail server credentials required. It works out-of-the-box just like the password reset emails you already receive from Google.

---

## 1. Overview & Core Concept

### What It Does
When a registered resident signs into the portal:
1. Entering username/email and password validates credentials against BCrypt.
2. For Two-Factor Authentication, the client calls Firebase Auth SDK's `sendSignInLinkToEmail(auth, registeredEmail, actionCodeSettings)`.
3. Google Firebase sends an authentic email directly to your registered Gmail with an official sign-in verification link.
4. When you open your Gmail and click the link (or click "Verify Email Link"):
   - Firebase Authentication securely verifies your email link (`isSignInWithEmailLink`).
   - The portal completes the authentication handshake with the backend and opens your verified Resident Dashboard.
5. If you prefer to stay on the page without opening the link, you can also use:
   - Direct Google Sign-In button (one-click bypass).
   - 6-digit database security code with instant autofill.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow 1: Sign-In with Official Firebase Email Link
```
[Sign-In Form] ──> Enter Username & Password ──> Click 'Sign In'
       │
       ▼
[2FA Challenge Screen]
  ├── Status: "Official Google Firebase Verification Email Sent!"
  ├── Recipient: "Sent to your registered Gmail: carinok92@gmail.com"
  ├── Instruction: "Open your Gmail inbox and click the official sign-in link."
  ├── [Open Gmail Inbox (gmail.com)] Shortcut Button
  ├── [Resend Verification Email] (with 60s cooldown timer)
  └── Alternative Options:
      ├── [Sign In with Google (Skip Link)]
      └── [Enter 6-Digit Passcode Instead]
```

#### Flow 2: Returning from Gmail Link Click
```
User clicks link in Gmail (https://ais-dev-.../?apiKey=...&mode=signIn)
       │
       ▼
App boots and detects 'isSignInWithEmailLink'
       │
       ▼
Firebase completes email sign-in ──> Backend issues resident session JWT
       │
       ▼
Redirects to Resident Dashboard with celebratory welcome banner!
```

### Visual Identity & Theme
- **Surface**: High-elevation frosted glassmorphism (`glass-panel`, `glass-card`) layered over deep ambient twilight blue background (`#0b1329`).
- **Typography**: Display headlines set in `Outfit` / `Plus Jakarta Sans`; monospace email tags in `JetBrains Mono`.
- **Status Banners**: Emerald verification status highlighting that the email was dispatched via Google Cloud servers.
- **Zero-Pill Restraint**: Unboxed metadata with clean typographic separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Native Firebase Auth `sendSignInLinkToEmail`
- **Chosen Approach**: Use Firebase Authentication's native passwordless email link mechanism (`sendSignInLinkToEmail`) for Two-Factor sign-in verification.
- **Why**: Google handles all SMTP, DKIM, SPF, and delivery infrastructure automatically. Emails arrive reliably in the user's Gmail inbox without needing a custom SMTP server or Google App Password.
- **Alternatives Considered**: Gmail SMTP with Nodemailer — rejected by user preference because standard Gmail accounts require manually creating and entering a 16-character App Password.

### Decision 2: Automatic URL Listener & Seamless In-App Completion
- **Chosen Approach**: When the application loads, check `isSignInWithEmailLink(auth, window.location.href)`. If true, automatically finish sign-in and redirect to the dashboard.
- **Why**: Allows users on mobile or desktop to click the link directly in their Gmail app or browser and instantly enter their resident portal.

### Decision 3: Dual Fallback Preservation
- **Chosen Approach**: Retain the 6-digit manual code input and direct Google Sign-In button as secondary tabs or toggles on the 2FA screen.
- **Why**: Guarantees zero lockout risk even if the user does not want to leave the active browser tab.

---

## 4. Technical Architecture & Data Strategy

### System Layout & Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Barangay Portal Client                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                         SignInPage                             │   │
│   │                                                                │   │
│   │   [Enter Credentials] ──> Validated by Backend Server          │   │
│   │                                  │                             │   │
│   │                                  ▼                             │   │
│   │   [2FA Challenge Screen]                                       │   │
│   │      │                                                         │   │
│   │      ├── Calls sendFirebaseSignInEmailLink(userEmail)          │   │
│   │      │                                                         │   │
│   └──────┼─────────────────────────────────────────────────────────┘   │
│          │                                                             │
└──────────┼─────────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Google Firebase Authentication Cloud Server               │
│                                                                        │
│   • Generates cryptographic action link                                │
│   • Dispatches official email to carinok92@gmail.com                   │
│   • From: noreply@favorable-outlook-98chg.firebaseapp.com              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
                         User's Gmail Inbox
                       (carinok92@gmail.com)
                                   │
                    User clicks verification link
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Barangay Portal Client                          │
│                                                                        │
│   • isSignInWithEmailLink(auth, window.location.href) == true          │
│   • signInWithEmailLink(auth, email, window.location.href)             │
│   • Calls POST /api/auth/firebase-email-link-login                     │
│   • Issues JWT Token and logs resident into Dashboard!                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Changes
1. **`src/lib/firebase.ts`**:
   - Add `sendFirebaseSignInEmailLink(email: string)` with `ActionCodeSettings` configured for the current origin.
   - Add `completeFirebaseEmailLinkSignIn(email?: string)` to parse incoming email link from the URL.
2. **`server.ts`**:
   - Add endpoint `POST /api/auth/firebase-email-link-login`: accepts verified Firebase `email`, `idToken`, and `uid`; issues JWT session and returns user profile.
3. **`src/components/SignInPage.tsx`**:
   - On 2FA initiation, trigger `sendFirebaseSignInEmailLink(targetEmail)`.
   - Display the dedicated Firebase Email Link verification card with instructions, "Open Gmail" shortcut, and resend button.
   - Detect email link upon URL boot and finalize login automatically.

---

## Verification & Testing Plan

1. **Compilation & Linting**:
   - Run `lint_applet` and `compile_applet` to confirm zero TypeScript or Rollup build errors.
2. **Email Link Dispatch Test**:
   - Trigger sign-in for resident account with email `carinok92@gmail.com`.
   - Verify `sendSignInLinkToEmail` succeeds without errors.
   - Confirm the 2FA UI shows delivery confirmation to `carinok92@gmail.com`.
3. **Email Link Verification & Login Test**:
   - Test email link completion flow.
   - Test fallback options (Google Sign-In button and 6-digit passcode).
