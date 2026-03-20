import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios';
import API_URL from '../API';
import './UserAuthStylesheet.css'
import { Mail, User, Lock } from 'lucide-react';

type ButtonState = 'default' | 'loading' | 'success' | 'error';

export default function Login() {

    const nav = useNavigate();
    const [getEmail,    setEmail]    = useState('');
    const [getUsername, setUsername] = useState('');
    const [getPassword, setPassword] = useState('');

    const [serverError,   setServerError]   = useState('');
    const [serverSuccess, setServerSuccess] = useState('');
    const [buttonState,   setButtonState]   = useState<ButtonState>('default');

    const [emailError,    setEmailError]    = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');

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

    function handleUsernameChange(value: string) {
        setUsername(value);
        if (value.trim() === '') {
            setUsernameError('Username is required.');
        } else if (value.length < 3) {
            setUsernameError('Username must be at least 3 characters.');
        } else {
            setUsernameError('');
        }
    }

    function handlePasswordChange(value: string) {
        setPassword(value);
        if (value.trim() === '') {
            setPasswordError('Password is required.');
        } else if (value.length < 8) {
            setPasswordError('Password must be at least 8 characters.');
        } else {
            setPasswordError('');
        }
    }

    function validateAll() {
        handleEmailChange(getEmail);
        handleUsernameChange(getUsername);
        handlePasswordChange(getPassword);
        return (
            getEmail.trim() !== '' &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getEmail) &&
            getUsername.trim() !== '' &&
            getUsername.length >= 3 &&
            getPassword.length >= 8
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

        axios
            .post(`${API_URL}/login`, {
                email:    getEmail,
                username: getUsername,
                password: getPassword,
            })
            .then((response: any) => {
                const { access_token, user } = response.data;

                // ─── KEY FIX: save under 'userSession' so all pages can read it ───
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('userSession',  JSON.stringify(user));

                setServerSuccess(response.data.message);
                setButtonState('success');

                setTimeout(() => {
                    // Route by role
                    const role = user?.role;
                    if (role === 'admin') {
                        nav('/admin/home');
                    } else if (role === 'vet') {
                        nav('/doctor/home');
                    } else {
                        nav('/user/home');
                    }
                }, 1500);
            })
            .catch((error: any) => {
                console.error('Login error:', error);

                // 403 = email not yet confirmed — backend already sent fresh OTP
                if (error.response?.status === 403) {
                    nav('/ConfirmOTP', { state: { email: getEmail, mode: 'emailConfirmation' } });
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

                    <div className='form'>

                        {/* Email */}
                        <div className="inputContainer">
                            <p className={emailError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                Email {emailError && <span className='errorAsterisk'>*</span>}
                            </p>
                            <div className='inputFieldContainer'>
                                <Mail className='inputIcons'/>
                                <input
                                    className={emailError ? 'inputFields errorField' : 'inputFields'}
                                    type="text"
                                    onChange={e => handleEmailChange(e.target.value)}
                                />
                            </div>
                            {emailError && <p className='errorMessage'>{emailError}</p>}
                        </div>

                        {/* Username */}
                        <div className="inputContainer">
                            <p className={usernameError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                Username {usernameError && <span className='errorAsterisk'>*</span>}
                            </p>
                            <div className='inputFieldContainer'>
                                <User className='inputIcons'/>
                                <input
                                    className={usernameError ? 'inputFields errorField' : 'inputFields'}
                                    type="text"
                                    onChange={e => handleUsernameChange(e.target.value)}
                                />
                            </div>
                            {usernameError && <p className='errorMessage'>{usernameError}</p>}
                        </div>

                        {/* Password */}
                        <div className="inputContainer">
                            <p className={passwordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                Password {passwordError && <span className='errorAsterisk'>*</span>}
                            </p>
                            <div className='inputFieldContainer'>
                                <Lock className='inputIcons'/>
                                <input
                                    className={passwordError ? 'inputFields errorField' : 'inputFields'}
                                    type="password"
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