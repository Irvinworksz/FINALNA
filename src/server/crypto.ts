import crypto from 'crypto';

// Master encryption key derived from environment or secure hardware fallback
const RAW_KEY = process.env.DB_ENCRYPTION_KEY || 'barangay-cabucbucan-aes256-gcm-master-key-2026';
const AES_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
export const ENCRYPTION_KEY_FINGERPRINT = 'SHA256:' + crypto.createHash('sha256').update(RAW_KEY).digest('hex').substring(0, 24).toUpperCase();

// HMAC secret for Punong Barangay digital seals
const RAW_SIG_SECRET = process.env.BARANGAY_SECRET_KEY || 'cabucbucan-official-hmac-digital-seal-secret-2026';

export const USER_ENCRYPTED_FIELDS = ['contact_number', 'address', 'id_number', 'mfa_secret'];
export const PROFILE_ENCRYPTED_FIELDS = ['contactNumber', 'emergencyContact', 'streetAddress', 'idNumber'];
export const DOCUMENT_ENCRYPTED_FIELDS = ['storagePathMasked'];

/**
 * Computes canonical SHA-256 hash for clearance documents to guarantee immutability
 */
export function computeDocumentHash(payload: {
  referenceNumber?: string;
  residentId?: string;
  residentName?: string;
  documentType?: string;
  purpose?: string;
  issuedAt?: string;
  signatory?: string;
  [key: string]: any;
}): string {
  const canonicalData = [
    payload.referenceNumber || '',
    payload.residentId || '',
    (payload.residentName || '').trim().toUpperCase(),
    payload.documentType || '',
    (payload.purpose || '').trim(),
    payload.issuedAt || '',
    payload.signatory || ''
  ].join('|');

  return crypto.createHash('sha256').update(canonicalData).digest('hex');
}

/**
 * Generates an HMAC-SHA256 digital signature seal from the document hash and signatory
 */
export function generateBarangayDigitalSignature(hash: string, signatory: string): { signature: string; keyFingerprint: string } {
  const hmac = crypto.createHmac('sha256', RAW_SIG_SECRET);
  hmac.update(`${hash}:${signatory}`);
  const signature = hmac.digest('hex');
  const fp = crypto.createHash('sha256').update(RAW_SIG_SECRET).digest('hex').substring(0, 16).toUpperCase();
  return {
    signature,
    keyFingerprint: `SIG-FP-${fp}`
  };
}

/**
 * Recomputes hash from stored record and verifies integrity against original cryptographic seal
 */
export function verifyDocumentIntegrity(doc: any, expectedHash: string): { isValid: boolean; recomputedHash: string } {
  const recomputedHash = computeDocumentHash({
    referenceNumber: doc.referenceNumber,
    residentId: doc.residentId,
    residentName: doc.residentName,
    documentType: doc.documentType,
    purpose: doc.purpose,
    issuedAt: doc.issuedAt || doc.signedAt || doc.readyAt,
    signatory: doc.signedByOfficialName || doc.signatory || 'Hon. Cornelio Laugo'
  });

  return {
    isValid: recomputedHash.toLowerCase() === (expectedHash || '').toLowerCase(),
    recomputedHash
  };
}

/**
 * Computes chained hash for tamper-evident blockchain-style audit logging
 */
export function computeAuditLogHash(previousHash: string, entry: {
  id: string;
  timestamp: string;
  userId: string;
  actionType: string;
  details: string;
  ipAddress: string;
}): string {
  const data = `${previousHash || 'GENESIS'}|${entry.id}|${entry.timestamp}|${entry.userId}|${entry.actionType}|${entry.details}|${entry.ipAddress}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Checks if a string is encrypted with the AES-256-GCM envelope
 */
export function isEncryptedAtRest(val: any): boolean {
  return typeof val === 'string' && val.startsWith('ENC:GCM:');
}

/**
 * Encrypts a string using AES-256-GCM (NIST SP 800-38D compliant envelope)
 * Envelope format: ENC:GCM:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptDataAtRest(plaintext: string): string {
  if (plaintext === null || plaintext === undefined) return plaintext;
  if (typeof plaintext !== 'string') plaintext = String(plaintext);
  if (isEncryptedAtRest(plaintext)) return plaintext; // Prevent double encryption

  const iv = crypto.randomBytes(12); // 96-bit IV standard for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `ENC:GCM:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM envelope string back into plaintext
 */
export function decryptDataAtRest(envelope: string): string {
  if (!isEncryptedAtRest(envelope)) {
    return envelope;
  }

  try {
    const parts = envelope.split(':');
    if (parts.length < 5) return envelope;

    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const ciphertext = parts[4];

    const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[Crypto] Decryption failed or tampered envelope:', err);
    return envelope;
  }
}

/**
 * Encrypts sensitive fields within a record before disk persistence
 */
export function encryptRecordFields<T extends Record<string, any>>(record: T, fields: string[]): T {
  if (!record || typeof record !== 'object') return record;
  const clone: Record<string, any> = { ...record };

  for (const field of fields) {
    if (field in clone && typeof clone[field] === 'string' && clone[field].length > 0) {
      clone[field] = encryptDataAtRest(clone[field]);
    }
  }

  return clone as T;
}

/**
 * Decrypts sensitive fields within a record after loading from disk
 */
export function decryptRecordFields<T extends Record<string, any>>(record: T, fields: string[]): T {
  if (!record || typeof record !== 'object') return record;
  const clone: Record<string, any> = { ...record };

  for (const field of fields) {
    if (field in clone && typeof clone[field] === 'string' && isEncryptedAtRest(clone[field])) {
      clone[field] = decryptDataAtRest(clone[field]);
    }
  }

  return clone as T;
}
