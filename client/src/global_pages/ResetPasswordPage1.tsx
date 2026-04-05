import { useState } from 'react';
import './UserAuthStylesheet.css'
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// 🟢 Notice: Axios import has been removed
import API_URL from '../API';

export default function ResetPasswordPage1() {
    const nav = useNavigate();
    const [getEmail, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [serverError, setServerError] = useState('');
    const [serverSuccess, setServerSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    function handleEmailChange(value: string) {
        setEmail(value);
        if (value.trim() === '') {
            setEmailError('Email is required.');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setEmailError('Please enter a valid email.');
        } else {
            setEmailError('');
        }
    }

    function validateAll() {
        handleEmailChange(getEmail);
        return (
            getEmail.trim() !== '' &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getEmail)
        );
    }

    function forgotPasswordHandler() {
        setServerError('');
        setServerSuccess('');

        if (!validateAll()) return;

        setIsLoading(true);
        const normalizedEmail = getEmail.trim().toLowerCase();

        // 🟢 FIX: Replaced Axios with native 'fetch'
        fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "email": normalizedEmail
            })
        })
        .then(async (response) => {
            // Convert the response to JSON
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // If the server sends an error (like a 400 or 500 status)
                throw new Error(data.error || 'Something went wrong. Please try again.');
            }

            // If successful!
            setServerSuccess(data.message);
            setIsLoading(false);
            if (!data.otpSent) return;
            setTimeout(() => {
                // ← pass email to next page via router state
                nav('/confirmOTP', { state: { email: normalizedEmail, mode: 'passwordReset' } });
            }, 1500);
        })
        .catch((error: any) => {
            setServerError(error.message);
            setIsLoading(false);
        });
    }

    return (
        <div className='resetMain'>
            <div className='resetCard'>

                <div className='resetHeader'>
                    <div className='resetIconWrapper'>
                        <Mail size={28} color='#2619e2' />
                    </div>
                    <h2>Forgot Password</h2>
                    <p>Enter your email address and we'll send you a one-time password (OTP) to reset your password.</p>
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

                <div className='resetInputContainer'>
                    <p className={emailError ? 'resetInputLabel errorLabel' : 'resetInputLabel'}>
                        Email {emailError && <span className='errorAsterisk'>*</span>}
                    </p>
                    <div className='resetInputFieldContainer'>
                        <Mail className='resetInputIcon' />
                        <input
                            className={emailError ? 'resetInputField errorField' : 'resetInputField'}
                            type="text"
                            placeholder="Enter your email"
                            onChange={(e) => handleEmailChange(e.target.value)}
                        />
                    </div>
                    {emailError && <p className='errorMessage'>{emailError}</p>}
                </div>

                <button
                    className='resetButton'
                    onClick={forgotPasswordHandler}
                    disabled={isLoading}>
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>

                <button className='resetPageNavigator' onClick={() => nav('/login')}>
                    Back to <strong style={{ color: '#2619e2' }}>Login</strong>
                </button>

            </div>
        </div>
    );
}
