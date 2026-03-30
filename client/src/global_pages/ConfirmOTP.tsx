import React, { useState, useRef, useEffect } from 'react';
import './UserAuthStylesheet.css'
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../API';

const OTP_EXPIRY_SECONDS   = 10 * 60; // 10 minutes — matches backend
const RESEND_COOLDOWN_SECS = 60;       // 60s between resend requests

export default function ConfirmOTP() {
    const nav      = useNavigate();
    const location = useLocation();

    const email = (location.state as { email: string; mode?: string })?.email || '';
    const mode  = (location.state as { email: string; mode?: string })?.mode || 'passwordReset';

    const isEmailConfirmation = mode === 'emailConfirmation';

    const [otp, setOtp]                       = useState(['', '', '', '', '', '']);
    const [otpError, setOtpError]             = useState('');
    const [serverError, setServerError]       = useState('');
    const [serverSuccess, setServerSuccess]   = useState('');
    const [isLoading, setIsLoading]           = useState(false);
    const [isResending, setIsResending]       = useState(false);

    // Counts DOWN from OTP_EXPIRY_SECONDS → 0
    const [expirySeconds, setExpirySeconds]   = useState(OTP_EXPIRY_SECONDS);
    // Counts DOWN from RESEND_COOLDOWN_SECS → 0 after each send
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECS);

    const expiryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inputRefs         = useRef<(HTMLInputElement | null)[]>([]);

    // ── Start timers on mount ────────────────────────────────────────────────
    useEffect(() => {
        startExpiryTimer();
        startResendCooldown();
        return () => {
            clearInterval(expiryIntervalRef.current!);
            clearInterval(resendIntervalRef.current!);
        };
    }, []);

    function startExpiryTimer() {
        clearInterval(expiryIntervalRef.current!);
        setExpirySeconds(OTP_EXPIRY_SECONDS);
        expiryIntervalRef.current = setInterval(() => {
            setExpirySeconds(prev => {
                if (prev <= 1) { clearInterval(expiryIntervalRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    function startResendCooldown() {
        clearInterval(resendIntervalRef.current!);
        setResendCooldown(RESEND_COOLDOWN_SECS);
        resendIntervalRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(resendIntervalRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    function formatTime(secs: number) {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // ── OTP input handlers ───────────────────────────────────────────────────
    function handleOtpChange(value: string, index: number) {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setOtpError('');
        if (value !== '' && index < 5) inputRefs.current[index + 1]?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').slice(0, 6).split('');
        if (!/^\d+$/.test(pasted.join(''))) return;
        const newOtp = [...otp];
        pasted.forEach((char, i) => { if (i < 6) newOtp[i] = char; });
        setOtp(newOtp);
        inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
    }

    // ── Verify OTP ───────────────────────────────────────────────────────────
    function confirmOtpHandler() {
        setServerError('');
        setServerSuccess('');

        if (!email) { setServerError('Session expired. Please restart the process.'); return; }
        if (expirySeconds === 0) { setServerError('Your OTP has expired. Please request a new one.'); return; }
        if (otp.join('').length < 6) { setOtpError('Please enter the complete 6-digit OTP.'); return; }

        setIsLoading(true);

        axios
            .post(`${API_URL}/verify-otp`, { email, otp: otp.join(''), mode })
            .then((response: any) => {
                setServerSuccess(response.data.message);
                clearInterval(expiryIntervalRef.current!);
                clearInterval(resendIntervalRef.current!);
                setIsLoading(false);
                setTimeout(() => {
                    if (isEmailConfirmation) {
                        nav('/login');
                    } else {
                        nav('/change-password', { state: { email } });
                    }
                }, 1500);
            })
            .catch((error: any) => {
                setServerError(error.response?.data?.error || 'Invalid OTP. Please try again.');
                setIsLoading(false);
            });
    }

    // ── Resend OTP ───────────────────────────────────────────────────────────
    function resendOtpHandler() {
        setServerError('');
        setServerSuccess('');

        if (!email) { setServerError('Session expired. Please restart the process.'); return; }

        setIsResending(true);

        axios
            .post(`${API_URL}/resend-otp`, { email, mode })
            .then(() => {
                setServerSuccess('A new OTP has been sent to your email.');
                setOtp(['', '', '', '', '', '']);
                setOtpError('');
                inputRefs.current[0]?.focus();
                startExpiryTimer();
                startResendCooldown();
                setIsResending(false);
            })
            .catch((error: any) => {
                setServerError(error.response?.data?.error || 'Failed to resend OTP. Please try again.');
                setIsResending(false);
            });
    }

    const otpExpired     = expirySeconds === 0;
    const submitDisabled = isLoading || otpExpired;
    const resendDisabled = resendCooldown > 0 || isResending;

    return (
        <div className='resetMain'>
            <div className='resetCard'>

                <div className='resetHeader'>
                    <div className='resetIconWrapper'>
                        {isEmailConfirmation
                            ? <UserCheck size={28} color='#2619e2' />
                            : <ShieldCheck size={28} color='#2619e2' />
                        }
                    </div>
                    <h2>{isEmailConfirmation ? 'Confirm Your Account' : 'Verify OTP'}</h2>
                    <p>
                        {isEmailConfirmation ? (
                            <>We sent a 6-digit confirmation code to <strong>{email}</strong>. Enter it below to activate your account.</>
                        ) : (
                            <>Enter the 6-digit one-time password sent to <strong>{email}</strong> to reset your password.</>
                        )}
                    </p>
                </div>

                {/* Expiry timer */}
                <div className={`otpTimerBadge ${otpExpired ? 'otpTimerExpired' : ''}`}>
                    {otpExpired
                        ? '⚠ OTP expired — please request a new one.'
                        : <>Code expires in <strong>{formatTime(expirySeconds)}</strong></>
                    }
                </div>

                {serverError && (
                    <div className='resetServerError'>
                        <p>{serverError}</p>
                    </div>
                )}
                {serverSuccess && (
                    <div className='resetServerSuccess'>
                        <p>{serverSuccess}</p>
                    </div>
                )}

                <div className='otpContainer'>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => {
                                inputRefs.current[index] = el;
                            }}
                            className={`otpBox${otpError || otpExpired ? ' otpBoxError' : ''}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            disabled={otpExpired}
                            onChange={(e) => handleOtpChange(e.target.value, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onPaste={handlePaste}
                        />
                    ))}
                </div>
                {otpError && <p className='errorMessage'>{otpError}</p>}

                <button
                    className='resetButton'
                    onClick={confirmOtpHandler}
                    disabled={submitDisabled}>
                    {isLoading
                        ? 'Verifying...'
                        : isEmailConfirmation ? 'Confirm Account' : 'Verify OTP'
                    }
                </button>

                {/* Resend row */}
                <div className='otpResendRow'>
                    <span className='otpResendLabel'>Didn't receive the code?</span>
                    {resendCooldown > 0 ? (
                        <span className='otpResendCooldown'>Resend in {resendCooldown}s</span>
                    ) : (
                        <button
                            className='otpResendBtn'
                            onClick={resendOtpHandler}
                            disabled={resendDisabled}>
                            {isResending ? 'Sending…' : 'Resend OTP'}
                        </button>
                    )}
                </div>

                <button className='resetPageNavigator' onClick={() => nav('/login')}>
                    Back to <strong style={{ color: '#2619e2' }}>Login</strong>
                </button>

            </div>
        </div>
    );
}
