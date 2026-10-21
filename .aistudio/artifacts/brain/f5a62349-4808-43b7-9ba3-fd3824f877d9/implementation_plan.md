# Firebase SMS Multi-Factor Authentication (MFA) for Resident Accounts

Integrates Google Firebase Phone Auth SMS Multi-Factor Authentication into the Barangay Cabucbucan Digital Portal, strictly enforcing SMS OTP verification on every login for Resident accounts while ensuring Desk Staff Officers and the Punong Barangay Captain bypass MFA for uninterrupted operations.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Mandatory Scope**: Mandatory for all resident logins on every sign-in.
> - **Role Exemption**: Strictly and exclusively for **Resident accounts**. Desk Staff (`staff`) and Punong Barangay Captain (`official`) are **completely exempt** and log in directly without MFA challenges.
> - **Phone Number Source**: Uses the contact number already registered in the resident's profile (automatically normalized to Philippine E.164 format: `+63 9XXXXXXXXX`).
> - **Fault-Tolerant Resilience**: If Firebase SMS limits, quota caps, or carrier delivery failures occur, the app provides an immediate and automatic **Email OTP fallback** to their registered Gmail address so residents are never locked out.

---

## 1. Overview & Core Concept

- **What It Does**:
  - Enhances resident authentication by adding Firebase SMS Phone Multi-Factor Authentication to the sign-in flow.
  - When a resident enters valid credentials, the portal formats their profile contact number to E.164 standard (`+63 9XXXXXXXXX`), mounts an invisible Google reCAPTCHA verifier, and dispatches a live SMS 6-digit verification code via Firebase Phone Auth.
  - The resident enters the 6-digit SMS code, which is verified directly against Firebase Auth servers (`confirmationResult.confirm(code)`).
  - Upon successful verification, the portal issues the authorized JWT session and loads the Resident Dashboard.
  - If SMS delivery fails or carrier issues occur, the resident can click "Send Code to Gmail Instead" (or the system automatically triggers Email OTP fallback).
  - Staff Desk Officers and the Punong Barangay Captain authenticate with their secure credentials and proceed directly to their dashboards without any MFA screen.

- **Target Persona & Security Value**:
  - **Residents**: Enhanced account security safeguarding personal civil records, clearance requests, and residency data using the phone number they provided at registration.
  - **Barangay Desk Staff & Captain**: Immediate operational access without SMS delays or dependency on mobile reception during in-person counter transactions and urgent document signing.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Resident Login Flow (MFA Active)**:
     - Resident enters username/email and password on the Sign-In page.
     - System validates password and detects `role === 'resident'`.
     - An invisible reCAPTCHA container activates in the background.
     - Firebase Phone Auth dispatches a real SMS verification code to the resident's registered phone number.
     - The Sign-In screen transitions to the **SMS Multi-Factor Authentication** card:
       - Header: "Two-Factor Verification Required" with a phone/SMS badge icon.
       - Description: `A 6-digit verification code has been sent via SMS to your registered mobile number (+63 9•• ••• ••••).`
       - Input: Centered 6-digit monospace code input with auto-advance and copy-paste support.
       - Action: "Verify & Enter Portal" primary button.
       - Resend timer: 60-second cooldown before requesting another SMS.
       - Fallback button: "Didn't receive SMS? Send code to registered Gmail instead".
     - Resident enters code -> verified -> redirected into Resident Portal.

  2. **Staff & Barangay Captain Login Flow (Exempt)**:
     - Desk Staff Officer or Punong Barangay enters their credentials.
     - System verifies credentials, notes non-resident role (`staff` or `official`), issues token immediately, and navigates straight to Staff Queue or Captain Executive Portal with zero prompts.

  3. **Automatic Fallback Flow (SMS Quota / Carrier Block)**:
     - If Firebase returns a quota error (`auth/quota-exceeded`), carrier error, or if the user clicks "Send to Gmail Instead", the UI seamlessly switches to Email OTP verification.
     - Backend dispatches a 6-digit code to their registered Gmail and updates the UI message to check their email inbox.

- **Design & Styling Standards**:
  - Archival Civil Registry theme matching existing app UI: Crisp white backgrounds (`#FFFFFF`), slate hairline borders (`border-slate-200/80`), deep navy badges, and zero decorative pills.
  - Sensitive phone numbers are masked (`+63 9•• ••• •567`) in the UI to prevent shoulder-surfing.
  - No security codes displayed on screen under any circumstance.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Firebase Phone Auth with Backend Token Finalization**
  - *Chosen Approach*: Use Firebase Web SDK `signInWithPhoneNumber` with invisible `RecaptchaVerifier` on the client, then pass the Firebase verification confirmation token to `/api/auth/verify-mfa` to exchange for the barangay session JWT.
  - *Why*: Directly leverages the SMS Multi-Factor Authentication enabled in the user's Firebase project without requiring external third-party SMS gateway subscriptions (e.g. Twilio).
  - *Trade-Off*: Requires a DOM anchor for reCAPTCHA (handled cleanly via an invisible `#recaptcha-container` div).

- **Decision 2: Phone Number Normalization to Philippine E.164**
  - *Chosen Approach*: Convert domestic resident mobile numbers (`09171234567` or `9171234567`) into canonical E.164 standard (`+639171234567`).
  - *Why*: Firebase Phone Auth requires international E.164 formatting; standardizing automatically prevents user formatting errors.

- **Decision 3: Strict Role Scoping at Both Server & Client Layers**
  - *Chosen Approach*: In `server.ts` (`/api/auth/login`), check `user.role === 'resident'`. Only residents return `mfaRequired: true`. Staff and Captain immediately receive session JWTs and proceed.
  - *Why*: Fulfills the explicit user requirement that desk staff and captain must not be burdened with SMS delays.

- **Decision 4: Seamless Dual-Channel Fallback (SMS -> Email OTP)**
  - *Chosen Approach*: Pair Firebase SMS with the existing Gmail SMTP dispatch engine as an instant alternative.
  - *Why*: Protects residents against carrier SMS delivery delays, signal blackspots, or Firebase free-tier daily SMS limits.

---

## 4. Technical Architecture & Data Strategy

### Authentication Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESIDENT & STAFF LOGIN                          │
│                                                                        │
│  User enters credentials on SignInPage.tsx                             │
│  POST /api/auth/login                                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │ Validate Credentials│
                         └──────────┬──────────┘
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
      [Role: staff OR official]             [Role: resident]
                   │                                 │
                   ▼                                 ▼
         Direct Login Success              MFA Required Triggered
         Issue JWT & Return Profile        Retrieve Contact Number (+63...)
                   │                       Return maskedPhone & mfaRequired
                   │                                 │
                   │                                 ▼
                   │                    ┌────────────────────────────┐
                   │                    │ SignInPage.tsx             │
                   │                    │ Invisible RecaptchaVerifier│
                   │                    │ signInWithPhoneNumber()    │
                   │                    └─────────────┬──────────────┘
                   │                                  │
                   │                    ┌─────────────┴──────────────┐
                   │                    ▼                            ▼
                   │            [SMS Dispatched]            [Carrier/Quota Error]
                   │                    │                            │
                   │            Resident Enters Code                 ▼
                   │                    │                 Fallback to Email OTP
                   │                    ▼                            │
                   │          confirmation.confirm()                 ▼
                   │                    │                 POST /api/auth/verify-mfa
                   │                    ▼                 (with Email OTP)
                   │          POST /api/auth/verify-mfa              │
                   │          (with Firebase Proof)                  │
                   │                    │                            │
                   └────────────────────┼────────────────────────────┘
                                        ▼
                           Issue Session JWT Token
                         Navigate to Designated Portal
```

### Components & Modules to Update

1. **`src/lib/firebase.ts`**:
   - Export `setupRecaptchaVerifier(containerId: string)`: Initializes and caches an invisible `RecaptchaVerifier` instance.
   - Export `sendFirebasePhoneOtp(phoneNumber: string, appVerifier: any)`: Calls `signInWithPhoneNumber(auth, phoneNumber, appVerifier)` and returns `ConfirmationResult`.
   - Export `formatToE164(contactNumber: string)`: Converts Philippine `09XXXXXXXXX` to `+639XXXXXXXXX`.
   - Export `maskPhoneNumber(phoneNumber: string)`: Masks for privacy display (`+63 9•• ••• •123`).

2. **`server.ts`**:
   - `/api/auth/login`:
     - Keep `isMfaEnabled = user.role === 'resident'`.
     - When `user.role !== 'resident'`, immediately issue session token (Staff & Captain exempt).
     - When `user.role === 'resident'`, fetch resident profile `contact_number`, normalize to `+63...`, mask phone number, and return `{ mfaRequired: true, mfaType: 'sms', phoneNumber, maskedPhone, email, maskedEmail }`.
   - `/api/auth/verify-mfa`:
     - Accept `{ firebaseVerification: true, idToken }` or `{ mfaCode }` (Email OTP fallback).
     - If `firebaseVerification` is true or Email OTP is valid, issue the resident's session JWT and log audit record.
   - `/api/auth/resend-mfa-otp`:
     - Support resending Email OTP if user requests fallback to email.

3. **`src/components/SignInPage.tsx`**:
   - Mount `<div id="recaptcha-container"></div>` (hidden).
   - When login response has `mfaRequired: true`:
     - If `phoneNumber` is present, automatically trigger Firebase SMS dispatch via `sendFirebasePhoneOtp`.
     - Render clean SMS MFA verification screen displaying the masked phone number.
     - Add 6-digit SMS input with auto-paste.
     - Add "Resend SMS" (with 60-second countdown).
     - Add "Send Code to Gmail Instead" button to switch seamlessly to Email OTP.
     - Verify code via `confirmationResult.confirm(code)` and complete session creation.

4. **`src/types.ts`**:
   - Ensure `LoginResponse` includes `phoneNumber?: string`, `maskedPhone?: string`, and `mfaType?: 'sms' | 'gmail'`.

---

## 5. Verification Plan

### Automated Build & Syntax Checks
- Run `npm run lint` (`lint_applet` / `tsc --noEmit`) to verify zero TypeScript errors.
- Run `npm run build` (`compile_applet`) to ensure Vite compilation bundle succeeds.

### Functional Verification
1. **Resident Login (SMS MFA)**:
   - Attempt login with resident account credentials.
   - Verify that MFA screen activates, invisible reCAPTCHA runs, and Firebase Phone Auth initiates SMS dispatch.
   - Verify phone number is masked (`+63 9•• ••• •XXX`).
   - Verify entering valid SMS code signs in and opens the Resident Portal.
2. **Staff & Captain Exemption**:
   - Log in as Desk Staff Officer (`staff_reyes` / `Staff@12345`). Verify immediate redirection to Staff Dashboard without MFA prompt.
   - Log in as Punong Barangay Captain (`captain_dela_cruz` / `Captain@12345`). Verify immediate redirection to Official Signing Portal without MFA prompt.
3. **Resilience & Email Fallback**:
   - On resident MFA challenge, click "Send Code to Gmail Instead".
   - Verify Email OTP is triggered and user can enter 6-digit email code to sign in.
