import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
// 🟢 Notice: Axios import has been removed
import API_URL from '../API';
import './UserAuthStylesheet.css'
import { Mail, User, Lock } from 'lucide-react';

type ButtonState = 'default' | 'loading' | 'success' | 'error';

export default function Login() {

    const nav = useNavigate();
    const [getIdentifier, setIdentifier] = useState('');
    const [getPassword, setPassword] = useState('');

    const [serverError, setServerError] = useState('');
    const [serverSuccess, setServerSuccess] = useState('');
    const [buttonState, setButtonState] = useState<ButtonState>('default');

    const [identifierError, setIdentifierError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    function isEmailIdentifier(value: string) {
        return value.includes('@');
    }

    function handleIdentifierChange(value: string) {
        setIdentifier(value);

        if (value.trim() === '') {
            setIdentifierError('Email or username is required.');
        } else if (isEmailIdentifier(value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setIdentifierError('Please enter a valid email.');
        } else if (!isEmailIdentifier(value) && value.length < 3) {
            setIdentifierError('Username must be at least 3 characters.');
        } else {
            setIdentifierError('');
        }
    }

    function handlePasswordChange(value: string) {
        setPassword(value);
        if (value.trim() === '') {
            setPasswordError('Password is required.');
        } else if (value.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
        } else {
            setPasswordError('');
        }
    }

    function validateAll() {
        handleIdentifierChange(getIdentifier);
        handlePasswordChange(getPassword);

        const identifierIsValid = isEmailIdentifier(getIdentifier)
            ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getIdentifier)
            : getIdentifier.trim().length >= 3;

        return (
            getIdentifier.trim() !== '' &&
            identifierIsValid &&
            getPassword.length >= 6
        );
    }

    function loginHandler() {
        setServerError('');
        setServerSuccess('');

        if (!validateAll()) {
            setButtonState('error');
            setTimeout(() => setButtonState('default'), 600);
            return;
        }

        setButtonState('loading');

        fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: getIdentifier,   // ← rename identifier → email
                password: getPassword,
            })
            })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // We format the error to perfectly match how your old Axios code expected it
                throw { response: { status: response.status, data: data } };
            }

            // Success Block (Using 'data' instead of 'response.data')
            const { access_token, user } = data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('userSession', JSON.stringify(user));

            setServerSuccess(data.message);
            setButtonState('success');

            setTimeout(() => {
                const normalizedRole = (user?.role || '').toLowerCase();

                if (normalizedRole === 'admin') {
                    nav('/admin/home');
                } else if (
                    normalizedRole === 'vet' ||
                    normalizedRole === 'doctor' ||
                    normalizedRole === 'veterinarian'
                ) {
                    nav('/doctor/home');
                } else {
                    nav('/user/home');
                }
            }, 1500);
        })
        .catch((error: any) => {
            console.error('Login error:', error);

            if (error.response?.status === 403) {
                nav('/ConfirmOTP', {
                    state: {
                        email: error.response?.data?.email ?? getIdentifier,
                        mode: 'emailConfirmation'
                    }
                });
                return;
            }

            const message = error.response?.data?.error || 'Something went wrong. Please try again.';
            setServerError(message);
            setButtonState('error');
            setTimeout(() => setButtonState('default'), 600);
        });
    }

    const isDisabled = buttonState === 'loading' || buttonState === 'success';

    function renderButtonContent() {
        if (buttonState === 'loading') return <span className="loginSpinner" />;
        if (buttonState === 'success') return (
            <svg className="loginCheckIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        );
        return 'Log In';
    }

    return (
        <div className="main">

            <div className='divisionContainers' id='divisionContainer1'>
                <div className='imageBackground'>
                    <div className='placeholders'>
                        <h2>Welcome to PawRang!</h2>
                        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Porro aliquid nulla dolorem ad dignissimos, totam recusandae aperiam accusantium voluptatem libero, unde quos maxime illum qui aspernatur laborum magnam optio minima.</p>
                    </div>
                </div>
            </div>

            <div className='divisionContainers'>
                <div className="inputBox">

                    <div className='headerContent'>
                        <h2>Log In</h2>
                        <p>Please fill the fields below to log in.</p>
                    </div>

                    {serverError && (
                        <div className='serverErrorMessage'><p>{serverError}</p></div>
                    )}
                    {serverSuccess && (
                        <div className='serverSuccessMessage'><p>{serverSuccess}</p></div>
                    )}

                    <div className='form'>

                        <div className="inputContainer">
                            <p className={identifierError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                Email or Username {identifierError && <span className='errorAsterisk'>*</span>}
                            </p>
                            <div className='inputFieldContainer'>
                                {isEmailIdentifier(getIdentifier) ? (
                                    <Mail className='inputIcons' />
                                ) : (
                                    <User className='inputIcons' />
                                )}
                                <input
                                    className={identifierError ? 'inputFields errorField' : 'inputFields'}
                                    type="text"
                                    value={getIdentifier}
                                    onChange={e => handleIdentifierChange(e.target.value)}
                                />
                            </div>
                            {identifierError && <p className='errorMessage'>{identifierError}</p>}
                        </div>

                        <div className="inputContainer">
                            <p className={passwordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                Password {passwordError && <span className='errorAsterisk'>*</span>}
                            </p>
                            <div className='inputFieldContainer'>
                                <Lock className='inputIcons'/>
                                <input
                                    className={passwordError ? 'inputFields errorField' : 'inputFields'}
                                    type="password"
                                    value={getPassword}
                                    onChange={e => handlePasswordChange(e.target.value)}
                                />
                            </div>
                            {passwordError && <p className='errorMessage'>{passwordError}</p>}
                        </div>

                        <button
                            id='loginButton'
                            className={`button loginButton--${buttonState}`}
                            onClick={loginHandler}
                            disabled={isDisabled}
                        >
                            {renderButtonContent()}
                        </button>

                        <button className='pageNavigator' onClick={() => nav('/resetpassword')}>
                            <p style={{ color: '#2619e2', fontSize: 18 }}>Forgot Password</p>
                        </button>
                        <button className='pageNavigator' onClick={() => nav('/register')}>
                            <p style={{ fontSize: 18 }}>Don't have an account? <strong style={{ color: '#2619e2' }}>Register</strong></p>
                        </button>

                    </div>
                </div>
            </div>

        </div>
    );
}