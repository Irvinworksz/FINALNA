import React, { useState, useEffect } from 'react';
import { Mail, Check, Copy, RefreshCw, X, Shield, Clock, ExternalLink, Sparkles, Inbox, AlertTriangle } from 'lucide-react';

interface OtpMailMessage {
  id: string;
  challengeId: string;
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

interface OtpMailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId?: string;
  recipientEmail?: string;
  onFillCode: (code: string) => void;
  onOpenSmtpSettings: () => void;
}

export const OtpMailerModal: React.FC<OtpMailerModalProps> = ({
  isOpen,
  onClose,
  challengeId,
  recipientEmail,
  onFillCode,
  onOpenSmtpSettings
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMessage, setActiveMessage] = useState<OtpMailMessage | null>(null);
  const [allMessages, setAllMessages] = useState<OtpMailMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'inbox'>('current');
  const [copied, setCopied] = useState<boolean>(false);
  const [filled, setFilled] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOtpMail = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (challengeId) query.set('challengeId', challengeId);
      if (recipientEmail) query.set('email', recipientEmail);

      const res = await fetch(`/api/auth/otp-mailer/latest?${query.toString()}`);
      const data = await res.json();
      if (data.success && data.message) {
        setActiveMessage(data.message);
      } else {
        setActiveMessage(null);
      }

      // Also fetch inbox history
      const inboxRes = await fetch(`/api/auth/otp-mailer/inbox?${query.toString()}`);
      const inboxData = await inboxRes.json();
      if (inboxData.success && Array.isArray(inboxData.messages)) {
        setAllMessages(inboxData.messages);
      }
    } catch (err: any) {
      console.warn('Failed to fetch OTP mailer message:', err);
      setError('Could not reach the OTP Mailer server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOtpMail();
      const interval = setInterval(fetchOtpMail, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, challengeId, recipientEmail]);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFill = (code: string) => {
    onFillCode(code);
    setFilled(true);
    setTimeout(() => {
      setFilled(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="otp-mailer-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <Mail className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="otp-mailer-modal-title" className="font-extrabold text-base tracking-tight text-white">
                  Barangay Official OTP Mailer
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Dispatch
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Direct In-App Verification Service & Official Citizen Inbox
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close OTP Mailer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Latest 2FA Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>All Messages ({allMessages.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchOtpMail}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'current' ? (
            activeMessage ? (
              <div className="space-y-4">
                {/* Email Envelope Header */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {activeMessage.subject}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>From: <strong className="text-slate-700">{activeMessage.from}</strong></span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(activeMessage.dispatchedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500">To: </span>
                      <span className="font-mono font-bold text-slate-800">{activeMessage.recipientEmail}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        activeMessage.deliveredViaSmtp
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        <Check className="w-3 h-3" />
                        {activeMessage.deliveredViaSmtp ? 'Delivered via Gmail SMTP' : 'Official In-App Dispatch'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Code Hero Card */}
                <div className="bg-gradient-to-b from-blue-50 to-indigo-50/40 border-2 border-blue-200 rounded-3xl p-6 text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-800 uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Your 6-Digit Verification Code</span>
                  </div>

                  <div className="inline-block bg-white px-6 py-4 rounded-2xl border-2 border-dashed border-blue-400 shadow-sm">
                    <span className="text-4xl font-extrabold font-mono tracking-[0.35em] text-blue-700 select-all">
                      {activeMessage.otpCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs text-slate-600 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Valid for 5 minutes</span>
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">Single-use authentication challenge</span>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleFill(activeMessage.otpCode)}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{filled ? '✓ Filled into Form!' : 'One-Click Fill Code'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(activeMessage.otpCode)}
                      className="py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Informational Guidance Notice */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      Why is this code available here?
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      If your external Gmail SMTP credentials (Google App Password) are not yet configured on this dev environment, the Barangay Portal’s built-in OTP Mailer captures and holds the verification code so you are never locked out of testing.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No Pending Verification Messages</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sign in or click "Resend Code" on the 2FA screen to dispatch a fresh 6-digit passcode.
                </p>
              </div>
            )
          ) : (
            /* All Messages (Inbox) Tab */
            <div className="space-y-2">
              {allMessages.length > 0 ? (
                allMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 rounded-2xl transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{msg.subject}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 font-mono">
                          {new Date(msg.dispatchedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        To: {msg.recipientEmail} • Purpose: {msg.purpose}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-extrabold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                        {msg.otpCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFill(msg.otpCode)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  Inbox empty. No historical codes yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Live Gmail Options */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-700 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Gmail</span>
            </a>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSmtpSettings();
              }}
              className="text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
            >
              Configure Live Google App Password
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
