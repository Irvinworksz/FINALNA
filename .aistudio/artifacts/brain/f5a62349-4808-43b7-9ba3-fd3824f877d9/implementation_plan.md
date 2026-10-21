# Account Registration Enhancements & Multi-Portal Birthdate Display

Enhances the Barangay Cabucbucan civil registry onboarding and verification system by making Middle Name and Suffix optional, enforcing comprehensive form validation for all required fields, strictly restricting First Name and Last Name inputs to alphabetical letters with real-time keystroke filtering, and prominently surfacing resident birthdate and age across the Resident Profile, Staff Desk Queue, and Punong Barangay Executive Signing Portal.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Birthdate Visibility**: Resident birthdate will be prominently displayed on the **Resident Profile banner**, **Staff Desk verification queue**, and **Punong Barangay Executive Signing Portal**.
> - **Name Input Restrictions**: Numbers and special characters are **blocked instantly while typing** into First Name and Last Name fields, leaving only clean alphabetical characters and spaces.

- **Confirmed Decision 1**: Middle Name and Suffix are explicitly marked with `(Optional)` labels and will not block registration if left empty.
- **Confirmed Decision 2**: All mandatory fields (First Name, Last Name, Birthdate, Gender, Civil Status, Purok/Zone, Street Address, Mobile Number, Valid ID Type, ID Number, Username, Password, Confirm Password) must be completed before submission is permitted.
- **Confirmed Decision 3**: Birthdate will automatically calculate and display the applicant's age (e.g., `June 15, 1995 · 30 yrs old`) across desk review and captain signing views for immediate civil registry verification.

---

## 1. Overview & Core Concept

- **What It Does**:
  - Updates the resident account registration flow (both on `SignInPage.tsx` and `AuthModal.tsx`) to make Middle Name and Suffix optional while maintaining strict validation that prevents submission if any required field is empty.
  - Adds instant input sanitizers to First Name and Last Name input handlers (`/[^a-zA-Z\s]/g`), eliminating accidental numbers or punctuation symbols before they reach state.
  - Ensures resident birthdate is stored and formatted as a first-class citizen in both the local relational store and Cloud Firestore database.
  - Displays resident birthdate and computed age in:
    1. **Resident Portal**: Identity Header Card and Profile details.
    2. **Barangay Staff Dashboard**: Resident Desk Verification table and Application Review Modal.
    3. **Barangay Captain Signing Portal**: Executive Clearance Signing cards and High-Resolution ID Inspection modal.

- **Target Audience / Persona**:
  - **Residents**: Registering online without being forced to enter a non-existent middle name or suffix, protected by clear required-field indicators.
  - **Barangay Desk Staff**: Validating residency and government IDs against registered birthdates and civil census records.
  - **Punong Barangay (Captain)**: Authorizing clearance certificates with complete applicant demographic information visible on screen.

- **Key Value**: Eliminates registration friction for citizens without middle names or suffixes, enforces data integrity at the input layer, and provides seamless demographic verification for barangay officers.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Resident Registration**:
     - The user navigates to the Registration tab.
     - First Name and Last Name accept letters only; typing numbers or symbols produces no character insertion.
     - Middle Name and Suffix display subtle muted `(Optional)` text in their label headers.
     - If the user leaves any required field empty, the "Create Official Resident Account" button indicates missing items and submission displays a clear validation alert highlighting the unfilled fields.
     - On successful registration, the account is created, synced to Firestore, and authenticated immediately.
  2. **Resident Portal View**:
     - The resident logs in and sees their Identity Card banner.
     - The metadata strip displays: `ID Type: ID Number · Civil Status: Married · Birthdate: June 15, 1995 (30 yrs old) · Residency: 5 Years · Contact: 09171234567`.
  3. **Barangay Staff Review Queue**:
     - When staff clicks **Review** on an incoming clearance or resident application, the modal presents the Resident Summary Card featuring the applicant's **Date of Birth** and calculated age alongside their attached ID.
  4. **Captain Executive Signing Portal**:
     - The Punong Barangay reviews pending clearance requests; each card showcases the applicant's full legal name, Purok, document type, purpose, and **Date of Birth** to verify legal eligibility before applying the cryptographic HMAC-SHA256 signature seal.

- **Visual Identity & Theme**:
  - Archival Civil Registry theme following the institutional design standard: Clean white surfaces (`#FFFFFF`), subtle slate hairline borders (`border-slate-200/80`), deep navy badges (`#1E3A8A`), and crisp typography.
  - Required fields feature a crisp red asterisk (`*`), while optional fields feature a gentle pill-free gray caption (`text-slate-400 font-normal`).
  - No static pill wraps for metadata; values use clean, unboxed typography with typographic dot dividers (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-Time Keystroke Filtering for Names**
  - *Chosen Approach*: Intercept `onChange` events on First Name and Last Name inputs using `e.target.value.replace(/[^a-zA-Z\s]/g, '')`.
  - *Why*: Prevents user frustration by disallowing invalid characters immediately rather than failing only upon clicking Submit.
  - *Alternatives Considered*: Allowing invalid characters and showing an error message on blur/submit was considered, but immediate keystroke blocking was preferred per user selection.

- **Decision 2: Comprehensive Required-Field Guard**
  - *Chosen Approach*: Validate all mandatory fields on client and server (`firstName`, `lastName`, `birthDate`, `gender`, `civilStatus`, `purokZone`, `streetAddress`, `contactNumber`, `idType`, `idNumber`, `username`, `password`).
  - *Why*: Ensures data integrity and prevents incomplete citizen census records in the database.

- **Decision 3: Birthdate Field Propagation to Clearance Requests**
  - *Chosen Approach*: Populate `residentBirthDate` directly on `ClearanceRequest` records during application submission, while also fetching from `User` / `ResidentProfile` for backward compatibility with existing requests.
  - *Why*: Allows the Staff Review modal and Captain Signing portal to access applicant birthdates with zero extra API latency.

---

## 4. Technical Architecture & Data Strategy

### System Component & Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REGISTRATION WORKFLOW                           │
│                                                                        │
│  SignInPage.tsx / AuthModal.tsx                                        │
│  ┌───────────────────────┐  Letters Only   ┌────────────────────────┐  │
│  │ First Name / Last Name├────────────────►│ Real-Time Regex Filter │  │
│  └───────────────────────┘                 └────────────────────────┘  │
│  ┌───────────────────────┐  No Block       ┌────────────────────────┐  │
│  │ Middle Name / Suffix  ├────────────────►│ Marked '(Optional)'    │  │
│  └───────────────────────┘                 └────────────────────────┘  │
│  ┌───────────────────────┐  Strict Check   ┌────────────────────────┐  │
│  │ All Other Form Fields ├────────────────►│ Form Completion Guard  │  │
│  └───────────────────────┘                 └────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/auth/register
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API & PERSISTENCE                       │
│                                                                        │
│  server.ts (/api/auth/register)                                        │
│  ├─ Validates non-empty required fields & sanitizes inputs             │
│  ├─ Treats middleName & suffix as optional strings                     │
│  ├─ Saves to db.ts (Users & Profiles with AES-256-GCM encryption)      │
│  └─ Syncs birthDate to Cloud Firestore (firebaseSync.ts)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ RESIDENT PORTAL  │       │  STAFF DASHBOARD │       │ CAPTAIN SIGNING  │
│ ResidentDashboard│       │  StaffDashboard  │       │ OfficialSigning  │
│                  │       │                  │       │                  │
│ Shows Birthdate  │       │ Shows Birthdate  │       │ Shows Birthdate  │
│ & Age in Profile │       │ & Age in Review  │       │ on Clearance     │
│ Header Strip     │       │ Queue & Modal    │       │ Review Cards     │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Affected Files & Scope:
1. `src/components/SignInPage.tsx`:
   - Add real-time regex filtering on First Name and Last Name input handlers.
   - Mark Middle Name and Suffix labels as `(Optional)`.
   - Update submission validator to enforce all required fields (blocking empty submissions).
2. `src/components/AuthModal.tsx`:
   - Mirror real-time input filtering and optional middle name/suffix labels.
   - Synchronize completion validation.
3. `server.ts`:
   - Update `/api/auth/register` to strictly enforce required fields while keeping `middleName` and `suffix` optional.
   - Ensure `birth_date` is properly included on user and profile records.
   - Attach `residentBirthDate` and `residentCivilStatus` to newly created clearance requests in `/api/clearances/request`.
4. `src/types.ts`:
   - Ensure `residentBirthDate` is defined on `ClearanceRequest`.
5. `src/components/ResidentDashboard.tsx`:
   - Display `Birthdate: [Date] ([Age] yrs old)` in the Resident Identity Header metadata row.
6. `src/components/StaffDashboard.tsx`:
   - Display applicant Date of Birth & Age in the Resident Summary Card of the Review Modal and in the Desk Verification list.
7. `src/components/OfficialSigningPortal.tsx`:
   - Display applicant Date of Birth & Age on pending clearance cards and in the ID Inspection modal.
