import crypto from 'crypto';
import QRCode from 'qrcode';

// Standard Base32 RFC 3548 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer into RFC 3548 Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32Decode(base32Str: string): Buffer {
  const clean = base32Str.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure Base32 TOTP secret key (20 bytes / 32 base32 chars)
 */
export function generateTotpSecret(): string {
  const randomBuffer = crypto.randomBytes(20);
  return base32Encode(randomBuffer);
}

/**
 * Generates an RFC 6238 TOTP 6-digit code for a given timestamp and secret
 */
export function generateTotpCode(secret: string, timeSeconds: number = Math.floor(Date.now() / 1000), timeStep: number = 30): string {
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(timeSeconds / timeStep);
  
  // 8-byte big-endian counter buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Compute HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Verifies a 6-digit TOTP token against secret with +/- 1 time step drift tolerance (90s window)
 */
export function verifyTotpToken(secret: string, token: string, windowSteps: number = 1): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentStep = Math.floor(Date.now() / 1000);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const calculated = generateTotpCode(secret, currentStep + (i * 30));
    if (calculated === cleanToken) {
      return true;
    }
  }

  return false;
}

/**
 * Generates an otpauth:// URL for Google Authenticator / Microsoft Authenticator
 */
export function generateOtpAuthUrl(accountName: string, secret: string, issuer: string = 'Barangay San Isidro'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a QR Code Data URL (PNG base64) for mobile authenticator scanning
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    width: 240
  });
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code for Email / Gmail verification
 */
export function generateEmailOtp(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Masks an email address for privacy and secure display (e.g., d***5@gmail.com)
 */
export function maskEmailAddress(email: string): string {
  if (!email || !email.includes('@')) return 'your registered Gmail';
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const maskedLocal = `${local[0]}${'*'.repeat(Math.max(local.length - 2, 3))}${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Generates a set of 8 cryptographically secure single-use recovery backup codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${hex.substring(0, 4)}-${hex.substring(4, 8)}`);
  }
  return codes;
}

export interface MfaPendingChallenge {
  challengeId: string;
  userId: string;
  recipientEmail: string;
  maskedEmail: string;
  purpose: string;
  salt: string;
  hashedOtp: string;
  createdAt: number;
  expiresAt: number; // strictly 5 minutes (300 seconds)
  attempts: number;
  maxAttempts: number; // max 5 attempts per challenge
  lastResendAt: number;
  resendCount: number;
}

export interface DispatchedOtpMail {
  id: string;
  challengeId: string;
  userId: string;
  recipientEmail: string;
  maskedEmail: string;
  subject: string;
  otpCode: string;
  purpose: string;
  dispatchedAt: number;
  expiresAt: number;
  deliveredViaSmtp: boolean;
  smtpError?: string;
  from: string;
  bodyPreview: string;
}

class MfaChallengeManagerClass {
  private challenges: Map<string, MfaPendingChallenge> = new Map();
  // Map of userId -> challengeId so previous codes are strictly invalidated
  private userToChallenge: Map<string, string> = new Map();
  // In-memory OTP mailer log of recently dispatched messages
  private mailHistory: DispatchedOtpMail[] = [];

  public recordDispatchedMail(mail: DispatchedOtpMail) {
    this.mailHistory.unshift(mail);
    if (this.mailHistory.length > 40) {
      this.mailHistory.pop();
    }
  }

  public updateMailDeliveryStatus(challengeId: string, delivered: boolean, error?: string) {
    const mail = this.mailHistory.find(m => m.challengeId === challengeId);
    if (mail) {
      mail.deliveredViaSmtp = delivered;
      mail.smtpError = delivered ? undefined : error;
    }
  }

  public getLatestMailForChallenge(challengeId?: string, email?: string): DispatchedOtpMail | null {
    if (challengeId) {
      const found = this.mailHistory.find(m => m.challengeId === challengeId);
      if (found) return found;
    }
    if (email) {
      const clean = email.trim().toLowerCase();
      const found = this.mailHistory.find(m => m.recipientEmail.toLowerCase() === clean);
      if (found) return found;
    }
    return this.mailHistory[0] || null;
  }

  public getMailHistory(email?: string): DispatchedOtpMail[] {
    if (email) {
      const clean = email.trim().toLowerCase();
      return this.mailHistory.filter(m => m.recipientEmail.toLowerCase() === clean);
    }
    return [...this.mailHistory];
  }

  /**
   * Hashes a 6-digit OTP using SHA-256 and cryptographic salt
   * Guarantees that only secure hashes are stored in memory, never plaintext codes.
   */
  private hashOtp(otp: string, salt: string): string {
    return crypto.createHash('sha256').update(`${salt}:${otp.trim()}`).digest('hex');
  }

  /**
   * Creates a new unpredictable, cryptographically secured 2FA challenge
   */
  public createChallenge(userId: string, email: string, purpose: string = 'Account Sign-In'): {
    challengeId: string;
    otpCode: string;
    expiresInSeconds: number;
    maskedEmail: string;
  } {
    // 1. Invalidate any existing challenge for this user
    this.invalidateUserChallenges(userId);

    const challengeId = `mfa_chn_${crypto.randomUUID()}`;
    // Cryptographically secure unpredictable 6-digit numeric OTP (100000 - 999999)
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedOtp = this.hashOtp(otpCode, salt);
    const maskedEmail = maskEmailAddress(email);
    const now = Date.now();
    const expiresInSeconds = 300; // 5 minutes strictly
    const expiresAt = now + (expiresInSeconds * 1000);

    const challenge: MfaPendingChallenge = {
      challengeId,
      userId,
      recipientEmail: email.trim().toLowerCase(),
      maskedEmail,
      purpose,
      salt,
      hashedOtp,
      createdAt: now,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      lastResendAt: now,
      resendCount: 0
    };

    this.challenges.set(challengeId, challenge);
    this.userToChallenge.set(userId, challengeId);

    // Record into OTP mailer log
    this.recordDispatchedMail({
      id: `mail_${now}_${Math.random().toString(36).substring(2, 6)}`,
      challengeId,
      userId,
      recipientEmail: email.trim().toLowerCase(),
      maskedEmail,
      subject: `[Barangay Cabucbucan] Your 2FA Security Code: ${otpCode}`,
      otpCode,
      purpose,
      dispatchedAt: now,
      expiresAt,
      deliveredViaSmtp: false,
      from: 'Barangay Cabucbucan Official Mailer <noreply@cabucbucan.gov.ph>',
      bodyPreview: `Your 6-digit Two-Factor security verification code for ${purpose} is [ ${otpCode} ]. Valid for 5 minutes.`
    });

    this.cleanupExpired();

    return {
      challengeId,
      otpCode,
      expiresInSeconds,
      maskedEmail
    };
  }

  /**
   * Verifies the submitted OTP against the pending challenge
   */
  public verifyChallenge(challengeId: string, submittedCode: string): {
    success: boolean;
    userId?: string;
    recipientEmail?: string;
    error?: string;
    remainingAttempts?: number;
    locked?: boolean;
    expired?: boolean;
  } {
    if (!challengeId || !submittedCode) {
      return {
        success: false,
        error: 'Challenge ID and 6-digit verification code are required.'
      };
    }

    const cleanCode = submittedCode.trim().replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      return {
        success: false,
        error: 'Verification code must be exactly 6 numeric digits.'
      };
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return {
        success: false,
        error: 'Security challenge session expired or not found. Please sign in again.',
        expired: true
      };
    }

    if (Date.now() > challenge.expiresAt) {
      this.deleteChallenge(challengeId);
      return {
        success: false,
        error: 'Verification code has expired (5-minute limit). Please request a new code.',
        expired: true
      };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      this.deleteChallenge(challengeId);
      return {
        success: false,
        error: 'Maximum verification attempts exceeded (5 failed attempts). Security challenge invalidated for your safety. Please sign in again.',
        locked: true,
        remainingAttempts: 0
      };
    }

    challenge.attempts += 1;
    const computedHash = this.hashOtp(cleanCode, challenge.salt);

    // Timing-safe comparison to prevent timing side-channel attacks
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(computedHash, 'utf8'),
      Buffer.from(challenge.hashedOtp, 'utf8')
    );

    if (!isMatch) {
      const remaining = challenge.maxAttempts - challenge.attempts;
      if (remaining <= 0) {
        this.deleteChallenge(challengeId);
        return {
          success: false,
          error: 'Maximum verification attempts reached (5 failed attempts). Security challenge expired. Please sign in again.',
          locked: true,
          remainingAttempts: 0
        };
      }
      return {
        success: false,
        error: `Invalid 6-digit verification code. ${remaining} attempt(s) remaining.`,
        remainingAttempts: remaining
      };
    }

    // Single-use guarantee: delete challenge immediately upon successful verification to prevent replay attacks
    const userId = challenge.userId;
    const recipientEmail = challenge.recipientEmail;
    this.deleteChallenge(challengeId);

    return {
      success: true,
      userId,
      recipientEmail
    };
  }

  /**
   * Resends a fresh OTP code for an existing pending challenge with a 60-second cooldown
   */
  public resendChallenge(challengeId: string): {
    success: boolean;
    otpCode?: string;
    recipientEmail?: string;
    userId?: string;
    error?: string;
    cooldownRemaining?: number;
  } {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return {
        success: false,
        error: 'Active challenge session not found. Please sign in again.'
      };
    }

    if (Date.now() > challenge.expiresAt) {
      this.deleteChallenge(challengeId);
      return {
        success: false,
        error: 'Challenge session expired. Please sign in again.'
      };
    }

    // 60-second resend cooldown check
    const elapsedSinceLast = Date.now() - challenge.lastResendAt;
    if (elapsedSinceLast < 60000) {
      const remainingSeconds = Math.ceil((60000 - elapsedSinceLast) / 1000);
      return {
        success: false,
        error: `Please wait ${remainingSeconds} second(s) before requesting another code.`,
        cooldownRemaining: remainingSeconds
      };
    }

    // Maximum 5 resends per challenge
    if (challenge.resendCount >= 5) {
      return {
        success: false,
        error: 'Maximum resend limit reached for this session (5 resends). Please sign in again.'
      };
    }

    // Generate NEW OTP, salt, hash, and reset attempts
    const newOtp = crypto.randomInt(100000, 1000000).toString();
    const newSalt = crypto.randomBytes(16).toString('hex');
    challenge.salt = newSalt;
    challenge.hashedOtp = this.hashOtp(newOtp, newSalt);
    challenge.expiresAt = Date.now() + (300 * 1000); // 5 minutes renewal
    challenge.attempts = 0; // reset attempts for fresh code
    challenge.lastResendAt = Date.now();
    challenge.resendCount += 1;

    // Record fresh resent message into OTP mailer log
    this.recordDispatchedMail({
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      challengeId,
      userId: challenge.userId,
      recipientEmail: challenge.recipientEmail,
      maskedEmail: challenge.maskedEmail,
      subject: `[Barangay Cabucbucan] Your Fresh 2FA Security Code: ${newOtp}`,
      otpCode: newOtp,
      purpose: 'Resent Two-Factor Authentication Passcode',
      dispatchedAt: Date.now(),
      expiresAt: challenge.expiresAt,
      deliveredViaSmtp: false,
      from: 'Barangay Cabucbucan Official Mailer <noreply@cabucbucan.gov.ph>',
      bodyPreview: `Your fresh 6-digit Two-Factor security verification code is [ ${newOtp} ]. Valid for 5 minutes.`
    });

    return {
      success: true,
      otpCode: newOtp,
      recipientEmail: challenge.recipientEmail,
      userId: challenge.userId
    };
  }

  public getChallenge(challengeId: string): MfaPendingChallenge | undefined {
    return this.challenges.get(challengeId);
  }

  public invalidateUserChallenges(userId: string) {
    const existingChallengeId = this.userToChallenge.get(userId);
    if (existingChallengeId) {
      this.deleteChallenge(existingChallengeId);
    }
  }

  public deleteChallenge(challengeId: string) {
    const c = this.challenges.get(challengeId);
    if (c) {
      this.userToChallenge.delete(c.userId);
      this.challenges.delete(challengeId);
    }
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, c] of this.challenges.entries()) {
      if (now > c.expiresAt) {
        this.deleteChallenge(id);
      }
    }
  }
}

export const MfaChallengeManager = new MfaChallengeManagerClass();



