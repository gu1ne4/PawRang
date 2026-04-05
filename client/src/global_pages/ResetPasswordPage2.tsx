import { useState } from 'react';
import './UserAuthStylesheet.css'
import { Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import API_URL from '../API';

export default function ResetPasswordPage2() {
    const nav = useNavigate();
    const location = useLocation();

    // ← retrieve email passed from ConfirmOTP
    const email = (location.state as { email: string })?.email || '';

    const [getPassword, setPassword] = useState('');
    const [getPasswordConfirm, setPasswordConfirm] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [serverError, setServerError] = useState('');
    const [serverSuccess, setServerSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    function handlePasswordChange(value: string) {
        setPassword(value);
        if (value.trim() === '') {
            setPasswordError('Password is required.');
        } else if (value.length < 8) {
            setPasswordError('Password must be at least 8 characters.');
        } else {
            setPasswordError('');
        }
        if (getPasswordConfirm !== '' && value !== getPasswordConfirm) {
            setConfirmPasswordError('Passwords do not match.');
        } else if (getPasswordConfirm !== '') {
            setConfirmPasswordError('');
        }
    }

    function handleConfirmPasswordChange(value: string) {
        setPasswordConfirm(value);
        if (value.trim() === '') {
            setConfirmPasswordError('Please confirm your password.');
        } else if (value !== getPassword) {
            setConfirmPasswordError('Passwords do not match.');
        } else {
            setConfirmPasswordError('');
        }
    }

    function validateAll() {
        handlePasswordChange(getPassword);
        handleConfirmPasswordChange(getPasswordConfirm);
        return (
            getPassword.trim() !== '' &&
            getPassword.length >= 8 &&
            getPasswordConfirm === getPassword
        );
    }

    function changePasswordHandler() {
        setServerError('');
        setServerSuccess('');

        if (!email) {
            setServerError('Session expired. Please restart the password reset process.');
            return;
        }

        if (!validateAll()) return;

        setIsLoading(true);

        // 🟢 FIX: We replaced Axios with the built-in Javascript 'fetch' API!
        fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "email": email,
                "new_password": getPassword
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
            setTimeout(() => {
                nav('/login');
            }, 2000);
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
                        <Lock size={28} color='#2619e2' />
                    </div>
                    <h2>Change Password</h2>
                    <p>Please create a new and secure password for your account.</p>
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
                    <p className={passwordError ? 'resetInputLabel errorLabel' : 'resetInputLabel'}>
                        New Password {passwordError && <span className='errorAsterisk'>*</span>}
                    </p>
                    <div className='resetInputFieldContainer'>
                        <Lock className='resetInputIcon' />
                        <input
                            className={passwordError ? 'resetInputField errorField' : 'resetInputField'}
                            type="password"
                            placeholder="Enter new password"
                            onChange={(e) => handlePasswordChange(e.target.value)}
                        />
                    </div>
                    {passwordError && <p className='errorMessage'>{passwordError}</p>}
                </div>

                <div className='resetInputContainer'>
                    <p className={confirmPasswordError ? 'resetInputLabel errorLabel' : 'resetInputLabel'}>
                        Confirm Password {confirmPasswordError && <span className='errorAsterisk'>*</span>}
                    </p>
                    <div className='resetInputFieldContainer'>
                        <Lock className='resetInputIcon' />
                        <input
                            className={confirmPasswordError ? 'resetInputField errorField' : 'resetInputField'}
                            type="password"
                            placeholder="Confirm new password"
                            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        />
                    </div>
                    {confirmPasswordError && <p className='errorMessage'>{confirmPasswordError}</p>}
                </div>

                <button
                    className='resetButton'
                    onClick={changePasswordHandler}
                    disabled={isLoading}>
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                </button>

                <button className='resetPageNavigator' onClick={() => nav('/login')}>
                    Back to <strong style={{ color: '#2619e2' }}>Login</strong>
                </button>

            </div>
        </div>
    );
}