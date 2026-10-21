/**
 * Realistic Philippine Government-Issued ID SVG Generator
 * Generates sample ID cards as SVG data URLs for resident verification testing
 */

export function generateSampleIdDataUrl(
  idType: string,
  fullName: string,
  idNumber: string,
  purok: string = 'Purok 1'
): string {
  const safeFullName = (fullName || 'JUAN DELA CRUZ').toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeIdNumber = (idNumber || 'PSA-2026-0001').toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safePurok = (purok || 'Purok 1').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeType = (idType || 'PHILIPPINE NATIONAL ID').toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Pick color theme based on ID type
  let primaryColor = '#1e3a8a'; // Blue for PhilSys / National ID
  let secondaryColor = '#0284c7';
  let badgeText = 'REPUBLIKA NG PILIPINAS';

  if (safeType.includes('DRIVER')) {
    primaryColor = '#15803d'; // Green for LTO
    secondaryColor = '#059669';
    badgeText = 'LAND TRANSPORTATION OFFICE';
  } else if (safeType.includes('VOTER')) {
    primaryColor = '#b91c1c'; // Red for COMELEC
    secondaryColor = '#e11d48';
    badgeText = 'COMMISSION ON ELECTIONS';
  } else if (safeType.includes('BARANGAY')) {
    primaryColor = '#0f766e'; // Teal for Barangay
    secondaryColor = '#0d9488';
    badgeText = 'BARANGAY CABUCBUCAN CIVIL REGISTRY';
  } else if (safeType.includes('UMID') || safeType.includes('SSS')) {
    primaryColor = '#4338ca'; // Indigo for UMID
    secondaryColor = '#6366f1';
    badgeText = 'UNIFIED MULTI-PURPOSE ID';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="600" height="380">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Card Body -->
  <rect x="10" y="10" width="580" height="360" rx="16" fill="url(#bgGrad)" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/>

  <!-- Top Header Banner -->
  <path d="M 10 26 Q 10 10 26 10 L 574 10 Q 590 10 590 26 L 590 70 L 10 70 Z" fill="url(#bannerGrad)"/>

  <text x="300" y="32" fill="#fef08a" font-family="Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle" letter-spacing="2">
    ${badgeText}
  </text>
  <text x="300" y="52" fill="#ffffff" font-family="Arial, sans-serif" font-size="15" font-weight="800" text-anchor="middle" letter-spacing="1">
    ${safeType}
  </text>

  <!-- Watermark Seal Pattern -->
  <circle cx="480" cy="200" r="75" fill="none" stroke="${primaryColor}" stroke-opacity="0.08" stroke-width="6"/>
  <circle cx="480" cy="200" r="50" fill="none" stroke="${primaryColor}" stroke-opacity="0.06" stroke-width="3"/>

  <!-- Photo Box -->
  <rect x="35" y="90" width="130" height="160" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
  <!-- Avatar Silhouette -->
  <circle cx="100" cy="140" r="32" fill="#94a3b8"/>
  <path d="M 55 240 Q 100 185 145 240 Z" fill="#94a3b8"/>
  <rect x="35" y="222" width="130" height="28" fill="${primaryColor}" fill-opacity="0.9" rx="0 0 6 6"/>
  <text x="100" y="240" fill="#ffffff" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">VERIFIED</text>

  <!-- ID Details -->
  <g transform="translate(185, 95)" font-family="Arial, sans-serif">
    <!-- ID Number -->
    <text x="0" y="15" fill="#64748b" font-size="9" font-weight="bold" letter-spacing="1">IDENTIFICATION NUMBER / CRN</text>
    <text x="0" y="38" fill="#0f172a" font-size="17" font-weight="800" font-family="monospace" letter-spacing="2">${safeIdNumber}</text>

    <!-- Full Name -->
    <text x="0" y="65" fill="#64748b" font-size="9" font-weight="bold" letter-spacing="1">FULL LEGAL NAME</text>
    <text x="0" y="88" fill="#0f172a" font-size="16" font-weight="800">${safeFullName}</text>

    <!-- Address / Purok -->
    <text x="0" y="115" fill="#64748b" font-size="9" font-weight="bold" letter-spacing="1">JURISDICTION / RESIDENCE</text>
    <text x="0" y="132" fill="#334155" font-size="12" font-weight="600">${safePurok}, Cabucbucan, Rizal, N.E.</text>

    <!-- Issue & Expiry -->
    <text x="0" y="158" fill="#64748b" font-size="9" font-weight="bold" letter-spacing="1">STATUS</text>
    <text x="0" y="174" fill="#15803d" font-size="11" font-weight="700">● ACTIVE &amp; OFFICIAL RECORD</text>
  </g>

  <!-- Bottom Barcode & Security Hologram Strip -->
  <rect x="25" y="275" width="550" height="2" fill="#e2e8f0"/>
  
  <!-- Simulated Micro-Barcode -->
  <g transform="translate(35, 290)">
    <rect x="0" y="0" width="3" height="45" fill="#1e293b"/>
    <rect x="5" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="9" y="0" width="5" height="45" fill="#1e293b"/>
    <rect x="17" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="22" y="0" width="4" height="45" fill="#1e293b"/>
    <rect x="28" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="33" y="0" width="6" height="45" fill="#1e293b"/>
    <rect x="42" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="47" y="0" width="4" height="45" fill="#1e293b"/>
    <rect x="54" y="0" width="3" height="45" fill="#1e293b"/>
    <rect x="60" y="0" width="6" height="45" fill="#1e293b"/>
    <rect x="69" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="74" y="0" width="5" height="45" fill="#1e293b"/>
    <rect x="82" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="87" y="0" width="4" height="45" fill="#1e293b"/>
    <rect x="94" y="0" width="5" height="45" fill="#1e293b"/>
    <rect x="102" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="107" y="0" width="6" height="45" fill="#1e293b"/>
    <rect x="116" y="0" width="3" height="45" fill="#1e293b"/>
    <rect x="122" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="127" y="0" width="5" height="45" fill="#1e293b"/>
    <rect x="135" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="140" y="0" width="4" height="45" fill="#1e293b"/>
    <rect x="147" y="0" width="6" height="45" fill="#1e293b"/>
    <rect x="156" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="161" y="0" width="5" height="45" fill="#1e293b"/>
    <rect x="169" y="0" width="3" height="45" fill="#1e293b"/>
    <rect x="175" y="0" width="4" height="45" fill="#1e293b"/>
    <rect x="182" y="0" width="2" height="45" fill="#1e293b"/>
    <rect x="187" y="0" width="6" height="45" fill="#1e293b"/>
  </g>

  <!-- Holographic Seal Badge -->
  <g transform="translate(470, 285)">
    <circle cx="45" cy="30" r="26" fill="url(#bannerGrad)" opacity="0.9"/>
    <circle cx="45" cy="30" r="23" fill="none" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="45" y="27" fill="#ffffff" font-family="Arial, sans-serif" font-size="8" font-weight="bold" text-anchor="middle">OFFICIAL</text>
    <text x="45" y="38" fill="#fef08a" font-family="Arial, sans-serif" font-size="7" font-weight="bold" text-anchor="middle">SEAL</text>
  </g>

  <text x="245" y="325" fill="#94a3b8" font-family="Arial, sans-serif" font-size="9" font-style="italic">
    Republic of the Philippines · E-Civil Registry &amp; Residency Verification
  </text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
