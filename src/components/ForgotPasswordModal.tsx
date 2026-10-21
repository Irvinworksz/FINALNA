import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle2, KeyRound, Lock, Mail, Shield, ShieldCheck, 
  X, Eye, EyeOff, ArrowRight, RefreshCw, ExternalLink, Home, ArrowLeft
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { sendFirebasePasswordReset } from '../lib/firebase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [viewMode, setViewMode] = useState<'link_instructions' | 'enter_code'>('link_instructions');
  const [identifier, setIdentifier] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [emailDelivered, setEmailDelivered] = useState<boolean>(false);
  const [firebaseDispatched, setFirebaseDispatched] = useState<boolean>(false);
  const [firebaseError, setFirebaseError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [demoOtp, setDemoOtp] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');

  // Password requirement flags
  const isLengthValid = newPassword.length >= 8;
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
  const doPasswordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleResetState = () => {
    setStep('request');
    setViewMode('link_instructions');
    setIdentifier('');
    setUserId('');
    setRecipientEmail('');
    setMaskedEmail('');
    setEmailDelivered(false);
    setFirebaseDispatched(false);
    setFirebaseError(undefined);
    setEmailError(undefined);
    setDemoOtp('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMsg('');
    setInfoMsg('');
    setResendCooldown(0);
    onClose();
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMsg('Please enter your registered Gmail address or username.');
      return;
    }

    setLoading(true);
    const res = await apiClient.forgotPassword(cleanIdentifier);

    // Call Firebase Auth SDK directly in the browser to send an official password reset email to user's registered Gmail
    const targetEmail = res.email || (cleanIdentifier.includes('@') ? cleanIdentifier.toLowerCase() : '');
    let fbSent = false;
    let fbErr: string | undefined = undefined;

    if (targetEmail && targetEmail.includes('@')) {
      const fbResult = await sendFirebasePasswordReset(targetEmail);
      if (fbResult.success) {
        fbSent = true;
        // Strictly invalidate previous password so only the newly set password will be accepted
        apiClient.invalidateOldPassword(res.userId || targetEmail).catch(console.error);
      } else {
        fbErr = fbResult.error;
      }
    }

    setLoading(false);

    if ((res.success && res.userFound && res.userId) || fbSent) {
      setUserId(res.userId || 'fb-user');
      setRecipientEmail(res.email || targetEmail || res.maskedEmail || '');
      setMaskedEmail(res.maskedEmail || targetEmail || 'your registered Gmail');
      setEmailDelivered(Boolean(res.emailDelivered));
      setFirebaseDispatched(fbSent);
      setFirebaseError(fbErr);
      setEmailError(res.emailError);
      setDemoOtp(res.demoOtp || '');
      setOtpCode('');
      setStep('verify');
      setViewMode(fbSent ? 'link_instructions' : 'enter_code');
      setResendCooldown(30);

      const successNotice = fbSent
        ? `Official reset link dispatched to ${targetEmail}! Follow the link in your Gmail (check Spam if not in Primary).`
        : res.emailDelivered
        ? `A 6-digit security reset code has been sent directly to your Gmail inbox (${res.email || res.maskedEmail}).`
        : `A 6-digit security reset code has been generated for ${res.email || res.maskedEmail || targetEmail}.`;

      setInfoMsg(successNotice);
    } else {
      setErrorMsg(
        fbErr || res.error || res.message || `No registered account found matching "${cleanIdentifier}". Please verify your username or registered Gmail.`
      );
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanCode = otpCode.replace(/[^0-9]/g, '').trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!isLengthValid) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (!hasSpecialChar) {
      setErrorMsg('New password must contain at least one special character (e.g. ! @ # $ % ^ & *).');
      return;
    }

    if (!doPasswordsMatch) {
      setErrorMsg('New password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    const res = await apiClient.resetPassword({
      userId,
      otp: cleanCode,
      newPassword
    });
    setLoading(false);

    if (res.success) {
      setStep('success');
      onSuccess(res.message || 'Password successfully updated! You may now sign in.');
    } else {
      setErrorMsg(res.error || 'Invalid or expired 6-digit verification code. Please check the code and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-4 flex items-center justify-between border-b border-blue-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Reset Account Password</h3>
              <p className="text-xs text-blue-200/80">Official Self-Service Security Verification</p>
            </div>
          </div>
          <button
            onClick={handleResetState}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Clean Progress Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
              step === 'request'
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {step === 'request' ? '1' : '✓'}
            </span>
            <span className={`font-bold ${step === 'request' ? 'text-slate-900' : 'text-slate-600'}`}>
              1. Enter Gmail
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-300"></div>

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
              step === 'verify'
                ? 'bg-blue-600 text-white'
                : step === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}>
              {step === 'success' ? '✓' : '2'}
            </span>
            <span className={`font-bold ${step === 'verify' ? 'text-slate-900' : 'text-slate-400'}`}>
              {viewMode === 'link_instructions' ? '2. Check Gmail Link' : '2. Enter 6-Digit Code'}
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-300"></div>

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
              step === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}>
              3
            </span>
            <span className={`font-bold ${step === 'success' ? 'text-emerald-700' : 'text-slate-400'}`}>
              3. Done
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && step !== 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-start gap-2.5 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* STEP 1: REQUEST RESET */}
          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-start gap-2.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Account Recovery Verification</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Enter the Gmail address or username you used when registering your account. A password reset link will be sent to your Gmail inbox.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Registered Gmail Address or Username *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. delacruzjohnirvin05@gmail.com or username"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetState}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link to Gmail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2A: FOLLOW LINK IN GMAIL INSTRUCTIONS */}
          {step === 'verify' && viewMode === 'link_instructions' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Delivery Target Card */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-blue-50 border-2 border-emerald-300 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                        Official Reset Email Sent
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 break-all">
                        {recipientEmail || maskedEmail || identifier}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 shrink-0">
                    ✓ Link Dispatched
                  </span>
                </div>

                <div className="p-3.5 bg-white/95 rounded-xl border border-emerald-200 shadow-2xs">
                  <h4 className="text-sm font-black text-slate-900 leading-snug">
                    Follow the link in the Gmail you received to reset the password
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Google Firebase has sent a secure password reset link to your email. Click the link in that email to choose and save your new password.
                  </p>
                </div>
              </div>

              {/* Step by Step Guide */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>How to complete your password reset</span>
                </span>
                
                <div className="space-y-2 text-slate-700 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-snug">
                      Open your <strong>Gmail inbox</strong> for <span className="font-mono font-bold text-slate-900">{recipientEmail || maskedEmail || identifier}</span>. Check your <strong>Spam / Junk</strong> folder if you do not see it in Primary.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-snug">
                      Click the official <strong>Reset Password</strong> link inside the email to set and confirm your new secure password.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-snug">
                      Once reset, return here and click <strong>Back to Home Page to Sign In</strong> to log in with your new credentials!
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Primary Button: Back to home page to sign in again after */}
                <button
                  type="button"
                  onClick={handleResetState}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all"
                >
                  <Home className="w-4 h-4" />
                  <span>Back to Home Page to Sign In</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Gmail Inbox</span>
                  </a>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={() => handleRequestOtp()}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{resendCooldown > 0 ? `Resend Email (${resendCooldown}s)` : 'Resend Email'}</span>
                  </button>
                </div>
              </div>

              {/* Option to enter 6-digit code instead */}
              <div className="pt-2 text-center border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('enter_code')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer inline-flex items-center gap-1.5 hover:underline"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Prefer to enter a 6-digit verification code? Click here</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: ENTER 6-DIGIT CODE & NEW PASSWORD */}
          {step === 'verify' && viewMode === 'enter_code' && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4 animate-in fade-in">
              
              {/* Delivery Target Banner */}
              <div className="p-3.5 rounded-2xl text-xs space-y-1 border bg-blue-50 border-blue-200 text-blue-950">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Verification Code Recipient:</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Enter 6-Digit Code
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 text-xs">
                  {recipientEmail || maskedEmail}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Enter the 6-digit verification code sent to your registered Gmail and set your new password. Check your Spam or Promotions folder if not in Primary.
                </p>
              </div>

              {/* Instant Auto-Fill for Development / Unconfigured Gateway */}
              {demoOtp && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-900 block text-[11px]">Active Verification Code</span>
                    <span className="font-mono font-black text-amber-950 tracking-wider text-sm">{demoOtp}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtp)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Auto-Fill Code
                  </button>
                </div>
              )}

              {/* 6-Digit Passcode Input Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Enter 6-Digit Verification Code *
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${otpCode.length === 6 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {otpCode.length === 6 ? '✓ 6 digits' : `${otpCode.length}/6 digits`}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="------"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 rounded-xl text-xl font-mono font-black text-center tracking-[0.4em] text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* New Password Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters with 1 special symbol"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirement Checklist */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                  <span>{isLengthValid ? '✓' : '•'}</span>
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                  <span>{hasSpecialChar ? '✓' : '•'}</span>
                  <span>Contains at least 1 special character (!@#$%^&*)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${doPasswordsMatch ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                  <span>{doPasswordsMatch ? '✓' : '•'}</span>
                  <span>Passwords match</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {firebaseDispatched ? (
                    <button
                      type="button"
                      onClick={() => setViewMode('link_instructions')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Link</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setStep('request');
                        setOtpCode('');
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Back
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={() => handleRequestOtp()}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6 || !isLengthValid || !hasSpecialChar || !doPasswordsMatch}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Verifying & Saving...' : 'Confirm & Save Password'}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900">
                  Password Successfully Updated!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your official account password has been updated and securely synced.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-medium">
                You can now log in using your newly set password.
              </div>

              <button
                type="button"
                onClick={handleResetState}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Back to Home Page to Sign In</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
