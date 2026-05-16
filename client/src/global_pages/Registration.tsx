import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../API'
import './UserAuthStylesheet.css'
import { Mail, User, Phone, Lock, X } from 'lucide-react'
import UserAuthVisual, { UserAuthPoweredBy } from './UserAuthVisual'
import petShieldLogo from '../assets/PetshieldLogo.png'

type ButtonState = 'default' | 'loading' | 'success' | 'error'

interface RegistrationProps {
    modalMode?: boolean
    onLoginClick?: () => void
}

export default function Registration({ modalMode = false, onLoginClick }: RegistrationProps) {
    const nav = useNavigate()
    const [getFirstName, setFirstName] = useState('')
    const [getLastName, setLastName] = useState('')
    const [getContactNumber, setContactNumber] = useState('')
    const [getEmail, setEmail] = useState('')
    const [getUsername, setUsername] = useState('')
    const [getPassword, setPassword] = useState('')
    const [getPasswordConfirm, setPasswordConfirm] = useState('')
    const [serverError, setServerError] = useState('')
    const [serverSuccess, setServerSuccess] = useState('')
    const [buttonState, setButtonState] = useState<ButtonState>('default')
    const [emailError, setEmailError] = useState('')
    const [usernameError, setUsernameError] = useState('')
    const [firstNameError, setFirstNameError] = useState('')
    const [lastNameError, setLastNameError] = useState('')
    const [contactError, setContactError] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [confirmPasswordError, setConfirmPasswordError] = useState('')
    
    // Modal states
    const [agreeToTerms, setAgreeToTerms] = useState(false)
    const [termsError, setTermsError] = useState('')
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)

    function formatPhilippineContact(value: string) {
        let digits = value.replace(/\D/g, '')

        if (digits.startsWith('63')) {
            digits = digits.slice(2)
        }

        if (digits.startsWith('0')) {
            digits = digits.slice(1)
        }

        digits = digits.slice(0, 10)

        if (!digits) return '+63 '

        const first = digits.slice(0, 3)
        const second = digits.slice(3, 6)
        const third = digits.slice(6, 10)

        return ['+63', first, second, third].filter(Boolean).join(' ')
    }

    function normalizePhilippineContact(value: string) {
        let digits = value.replace(/\D/g, '')

        if (digits.startsWith('63')) {
            digits = digits.slice(2)
        }

        if (digits.startsWith('0')) {
            digits = digits.slice(1)
        }

        return `+63${digits.slice(0, 10)}`
    }

    function handleEmailChange(value: string) {
        setEmail(value)
        if (value.trim() === '') setEmailError('Email is required.')
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) setEmailError('Please enter a valid email.')
        else setEmailError('')
    }

    function handleUsernameChange(value: string) {
        setUsername(value)
        if (value.trim() === '') setUsernameError('Username is required.')
        else if (value.length < 3) setUsernameError('Username must be at least 3 characters.')
        else setUsernameError('')
    }

    function handleFirstNameChange(value: string) {
        setFirstName(value)
        setFirstNameError(value.trim() === '' ? 'First name is required.' : '')
    }

    function handleLastNameChange(value: string) {
        setLastName(value)
        setLastNameError(value.trim() === '' ? 'Last name is required.' : '')
    }

    function handleContactChange(value: string) {
        const formattedContact = formatPhilippineContact(value)
        const normalizedContact = normalizePhilippineContact(formattedContact)

        setContactNumber(formattedContact)
        if (normalizedContact === '+63') setContactError('Contact number is required.')
        else if (!/^\+63\d{10}$/.test(normalizedContact)) setContactError('Please enter a valid Philippine contact number.')
        else setContactError('')
    }

    function handlePasswordChange(value: string) {
        setPassword(value)
        if (value.trim() === '') setPasswordError('Password is required.')
        else if (value.length < 8) setPasswordError('Password must be at least 8 characters.')
        else if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value)) {
            setPasswordError('Password requires uppercase letter, lowercase letter, and number.')
        }
        else setPasswordError('')

        if (getPasswordConfirm !== '' && value !== getPasswordConfirm) setConfirmPasswordError('Passwords do not match.')
        else if (getPasswordConfirm !== '') setConfirmPasswordError('')
    }

    function handleConfirmPasswordChange(value: string) {
        setPasswordConfirm(value)
        if (value.trim() === '') setConfirmPasswordError('Please confirm your password.')
        else if (value !== getPassword) setConfirmPasswordError('Passwords do not match.')
        else setConfirmPasswordError('')
    }

    function handleTermsChange(checked: boolean) {
        setAgreeToTerms(checked)
        if (checked) {
            setTermsError('')
        }
    }

    function validateAll() {
        handleEmailChange(getEmail)
        handleUsernameChange(getUsername)
        handleFirstNameChange(getFirstName)
        handleLastNameChange(getLastName)
        handleContactChange(getContactNumber)
        handlePasswordChange(getPassword)
        handleConfirmPasswordChange(getPasswordConfirm)
        
        const termsAccepted = agreeToTerms
        if (!termsAccepted) {
            setTermsError('You must agree to the Terms & Conditions to create an account.')
        } else {
            setTermsError('')
        }

        return (
            getEmail.trim() !== '' &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(getEmail) &&
            getUsername.trim() !== '' &&
            getUsername.length >= 3 &&
            getFirstName.trim() !== '' &&
            getLastName.trim() !== '' &&
            /^\+63\d{10}$/.test(normalizePhilippineContact(getContactNumber)) &&
            getPassword.length >= 8 &&
            /[A-Z]/.test(getPassword) &&
            /[a-z]/.test(getPassword) &&
            /\d/.test(getPassword) &&
            getPasswordConfirm === getPassword &&
            termsAccepted
        )
    }

    async function registrationHandler() {
        setServerError('')
        setServerSuccess('')

        if (!validateAll()) {
            setButtonState('error')
            setTimeout(() => setButtonState('default'), 600)
            return
        }

        setButtonState('loading')

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: getEmail,
                    password: getPassword,
                    firstName: getFirstName,
                    lastName: getLastName,
                    username: getUsername,
                    contactNumber: normalizePhilippineContact(getContactNumber),
                    agreedToTerms: agreeToTerms,
                }),
            })

            const data = await response.json().catch(() => ({}))
            
            if (!response.ok) {
                if (response.status === 403 && data.redirect === 'confirmOTP') {
                    nav('/ConfirmOTP', { state: { email: getEmail, mode: 'emailConfirmation' } })
                    return
                }

                throw new Error(data.error || 'Something went wrong. Please try again.')
            }

            setServerSuccess(data.message)
            setButtonState('success')

            setTimeout(() => {
                nav('/confirmOTP', { state: { email: getEmail, mode: 'emailConfirmation' } })
            }, 1500)
        } catch (error: any) {
            console.error('Error:', error)
            const message = error.message || 'Something went wrong. Please try again.'
            setServerError(message)
            setButtonState('error')
            setTimeout(() => setButtonState('default'), 600)
        }
    }

    const isDisabled = buttonState === 'loading' || buttonState === 'success'

    function renderButtonContent() {
        if (buttonState === 'loading') return <span className="loginSpinner" />
        if (buttonState === 'success') {
            return (
                <svg className="loginCheckIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )
        }
        return 'Create Account'
    }

    return (
        <>
            <div className={modalMode ? 'main authModalMain' : 'main'}>
                <div className="authContainer">
                    <div className='divisionContainers' id='divisionContainer1'>
                        <UserAuthVisual />
                    </div>

                    <div className='divisionContainers'>
                        <div className="inputBox registerInputBox">
                            <div className="authFormBrand">
                                <img src={petShieldLogo} alt="PetShield" />
                            </div>
                            <div className='headerContent'>
                                <h2>Create an account</h2>
                                <p>Please fill the fields below to create an account.</p>
                            </div>

                            {serverError && <div className='serverErrorMessage'><p>{serverError}</p></div>}
                            {serverSuccess && <div className='serverSuccessMessage'><p>{serverSuccess}</p></div>}

                            <div className='form'>
                                <div className="inputContainer">
                                    <p className={emailError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                        Email {emailError && <span className='errorAsterisk'>*</span>}
                                    </p>
                                    <div className='inputFieldContainer'>
                                        <Mail className='inputIcons'/>
                                        <input className={emailError ? 'inputFields errorField' : 'inputFields'} type="text" placeholder="Enter your email address" onChange={(e) => handleEmailChange(e.target.value)} />
                                    </div>
                                    {emailError && <p className='errorMessage'>{emailError}</p>}
                                </div>

                                <div className="inputContainer">
                                    <p className={usernameError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                        Username {usernameError && <span className='errorAsterisk'>*</span>}
                                    </p>
                                    <div className='inputFieldContainer'>
                                        <User className='inputIcons'/>
                                        <input className={usernameError ? 'inputFields errorField' : 'inputFields'} type="text" placeholder="Choose a username" onChange={(e) => handleUsernameChange(e.target.value)} />
                                    </div>
                                    {usernameError && <p className='errorMessage'>{usernameError}</p>}
                                </div>

                                <div className='inputNameContainer'>
                                    <div className='inputNames'>
                                        <p className={firstNameError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                            First Name {firstNameError && <span className='errorAsterisk'>*</span>}
                                        </p>
                                        <div className='inputFieldContainer'>
                                            <User className='inputIcons'/>
                                            <input className={firstNameError ? 'inputFields errorField' : 'inputFields'} type="text" placeholder="First name" onChange={(e) => handleFirstNameChange(e.target.value)} />
                                        </div>
                                        {firstNameError && <p className='errorMessage'>{firstNameError}</p>}
                                    </div>
                                    <div className='inputNames'>
                                        <p className={lastNameError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                            Last Name {lastNameError && <span className='errorAsterisk'>*</span>}
                                        </p>
                                        <div className='inputFieldContainer'>
                                            <User className='inputIcons'/>
                                            <input className={lastNameError ? 'inputFields errorField' : 'inputFields'} type="text" placeholder="Last name" onChange={(e) => handleLastNameChange(e.target.value)} />
                                        </div>
                                        {lastNameError && <p className='errorMessage'>{lastNameError}</p>}
                                    </div>
                                </div>

                                <div className="inputContainer">
                                    <p className={contactError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                        Contact Number {contactError && <span className='errorAsterisk'>*</span>}
                                    </p>
                                    <div className='inputFieldContainer'>
                                        <Phone className='inputIcons'/>
                                        <input
                                            className={contactError ? 'inputFields errorField' : 'inputFields'}
                                            type="tel"
                                            inputMode="numeric"
                                            value={getContactNumber}
                                            placeholder="+63 9XX XXX XXXX"
                                            onChange={(e) => handleContactChange(e.target.value)}
                                        />
                                    </div>
                                    {contactError && <p className='errorMessage'>{contactError}</p>}
                                </div>

                                <div className="inputContainer">
                                    <p className={passwordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                        Password {passwordError && <span className='errorAsterisk'>*</span>}
                                    </p>
                                    <div className='inputFieldContainer'>
                                        <Lock className='inputIcons'/>
                                        <input className={passwordError ? 'inputFields errorField' : 'inputFields'} type="password" placeholder="Create a password" onChange={(e) => handlePasswordChange(e.target.value)} />
                                    </div>
                                    {passwordError && <p className='errorMessage'>{passwordError}</p>}
                                </div>

                                <div className="inputContainer">
                                    <p className={confirmPasswordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                                        Confirm Password {confirmPasswordError && <span className='errorAsterisk'>*</span>}
                                    </p>
                                    <div className='inputFieldContainer'>
                                        <Lock className='inputIcons'/>
                                        <input className={confirmPasswordError ? 'inputFields errorField' : 'inputFields'} type="password" placeholder="Confirm your password" onChange={(e) => handleConfirmPasswordChange(e.target.value)} />
                                    </div>
                                    {confirmPasswordError && <p className='errorMessage'>{confirmPasswordError}</p>}
                                </div>

                                {/* Terms & Conditions Checkbox */}
                                <div className="inputContainer authTermsContainer" style={{ marginTop: '20px', alignItems: 'center', marginBottom: '10px' }}>
                                    <div className="authTermsRow" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id="termsCheckbox"
                                            checked={agreeToTerms}
                                            onChange={(e) => handleTermsChange(e.target.checked)}
                                            style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="termsCheckbox" className="authTermsText" style={{ fontSize: '13px', color: '#585858', lineHeight: '1.4', cursor: 'pointer' }}>
                                            I agree to the{' '}
                                            <button
                                                type="button"
                                                className="authTermsLink"
                                                onClick={() => setShowTermsModal(true)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#0818a0',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    fontSize: '13px',
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                Terms & Conditions
                                            </button>
                                            {' '}and{' '}
                                            <button
                                                type="button"
                                                className="authTermsLink"
                                                onClick={() => setShowPrivacyModal(true)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#0818a0',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    fontSize: '13px',
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                Privacy Policy
                                            </button>
                                        </label>
                                    </div>
                                    {termsError && <p className='errorMessage' style={{ marginTop: '4px' }}>{termsError}</p>}
                                </div>

                                <button className={`button loginButton--${buttonState}`} onClick={registrationHandler} disabled={isDisabled}>
                                    {renderButtonContent()}
                                </button>

                                <div className="authNavigatorGroup">
                                    <button className='pageNavigator' onClick={() => (onLoginClick ? onLoginClick() : nav("/login"))}>
                                        <p>Already have an account? <strong style={{ color: '#0818a0' }}>Login</strong></p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <UserAuthPoweredBy />
            </div>

            {/* Terms & Conditions Modal */}
            {showTermsModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                    }}
                    onClick={() => setShowTermsModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '24px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: '20px 24px',
                                borderBottom: '2px solid #eef4ff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>
                                Terms & Conditions
                            </h3>
                            <button
                                onClick={() => setShowTermsModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                }}
                            >
                                <X size={24} color="#666" />
                            </button>
                        </div>
                        <div
                            style={{
                                padding: '24px',
                                overflowY: 'auto',
                                flex: 1,
                                fontSize: '14px',
                                lineHeight: '1.6',
                                color: '#333',
                            }}
                        >
                            <h4 style={{ fontSize: '18px', marginTop: 0 }}>1. Acceptance of Terms</h4>
                            <p>By creating an account and using PetShield's services, you agree to comply with and be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our services.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>2. User Accounts</h4>
                            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>3. Privacy Policy</h4>
                            <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>4. User Obligations</h4>
                            <p>You agree to provide accurate, current, and complete information during registration and to update such information as needed. You must not use the service for any illegal or unauthorized purpose.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>5. Service Modifications</h4>
                            <p>PetShield reserves the right to modify or discontinue the service at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>6. Termination</h4>
                            <p>We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms & Conditions or is harmful to other users or the service.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>7. Limitation of Liability</h4>
                            <p>To the maximum extent permitted by law, PetShield shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>8. Governing Law</h4>
                            <p>These Terms shall be governed by and construed in accordance with the laws of the Philippines, without regard to its conflict of law provisions.</p>

                            <h4 style={{ fontSize: '18px', marginTop: '20px' }}>9. Contact Information</h4>
                            <p>If you have any questions about these Terms, please contact us at support@petshield.com.</p>

                            <p style={{ marginTop: '24px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                                Last updated: {new Date().toLocaleDateString()}
                            </p>
                        </div>
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '2px solid #eef4ff',
                                display: 'flex',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <button
                                onClick={() => {
                                    handleTermsChange(true)
                                    setShowTermsModal(false)
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                }}
                            >
                                I Agree
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Policy Modal */}
            {showPrivacyModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                    }}
                    onClick={() => setShowPrivacyModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '24px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: '20px 24px',
                                borderBottom: '2px solid #eef4ff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e' }}>
                                Privacy Policy
                            </h3>
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                }}
                            >
                                <X size={24} color="#666" />
                            </button>
                        </div>
                        <div
                            style={{
                                padding: '24px',
                                overflowY: 'auto',
                                flex: 1,
                                fontSize: '14px',
                                lineHeight: '1.6',
                                color: '#333',
                            }}
                        >
                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                                    <strong>Last updated:</strong> {new Date().toLocaleDateString()}
                                </p>
                                <p>
                                    PetShield is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services.
                                </p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>1. Information We Collect</h4>
                                <p style={{ marginBottom: '8px' }}>When you create an account with PetShield, we collect:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}><strong>Personal Information:</strong> First name, last name, email address, username, and contact number</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Account Credentials:</strong> Password (encrypted and securely stored using industry-standard hashing)</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Usage Data:</strong> Information about how you interact with our services (optional analytics)</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>2. How We Use Your Information</h4>
                                <p>We use the collected information for:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}>✓ Creating and managing your account</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Authenticating your identity and securing your account</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Sending important account notifications and updates</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Improving our services and user experience</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Complying with legal obligations</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>3. Data Protection & Security</h4>
                                <p>We implement robust security measures to protect your information:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}>✓ End-to-end encryption for sensitive data</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Secure HTTPS connections for all data transmission</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Regular security updates and vulnerability monitoring</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Password hashing using bcrypt or similar algorithms</li>
                                    <li style={{ marginBottom: '6px' }}>✓ Limited employee access to user data</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>4. Data Sharing & Third Parties</h4>
                                <p><strong>We do NOT sell your personal information to third parties.</strong> We may share data only in these limited circumstances:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}>With service providers who assist in operating our application (under strict confidentiality agreements)</li>
                                    <li style={{ marginBottom: '6px' }}>When required by law, court order, or legal process</li>
                                    <li style={{ marginBottom: '6px' }}>To protect our rights, property, or safety, or that of our users</li>
                                    <li style={{ marginBottom: '6px' }}>In connection with a business transfer (merger, acquisition, or asset sale)</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>5. Data Retention</h4>
                                <p>We retain your personal information for as long as your account is active or as needed to provide you services. You may:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}>Request account deletion at any time</li>
                                    <li style={{ marginBottom: '6px' }}>Have your personal data removed within 30 days of request</li>
                                    <li style={{ marginBottom: '6px' }}>Note: Some information may be retained for legal compliance or fraud prevention</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>6. Your Rights (Philippine Data Privacy Act of 2012)</h4>
                                <p>Under Republic Act No. 10173, you have the following rights:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Access:</strong> You may request a copy of your personal data</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Rectification:</strong> You may correct inaccurate or incomplete data</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Erasure:</strong> You may request deletion of your data (subject to legal requirements)</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Restrict Processing:</strong> You may temporarily limit how we use your data</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Data Portability:</strong> You may obtain and transfer your data to another service</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Object:</strong> You may object to processing based on legitimate interests</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to Withdraw Consent:</strong> You may withdraw consent at any time</li>
                                    <li style={{ marginBottom: '6px' }}><strong>Right to File a Complaint:</strong> With the National Privacy Commission (NPC)</li>
                                </ul>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>7. Cookies & Tracking Technologies</h4>
                                <p>We may use cookies and similar tracking technologies to:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}>Enhance your browsing experience</li>
                                    <li style={{ marginBottom: '6px' }}>Analyze usage patterns and improve our services</li>
                                    <li style={{ marginBottom: '6px' }}>Remember your preferences and login sessions</li>
                                </ul>
                                <p style={{ marginTop: '8px' }}>You can control cookie preferences through your browser settings. Disabling cookies may affect functionality.</p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>8. Children's Privacy</h4>
                                <p>Our services are not directed to individuals under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover such data, we will delete it immediately. Parents or guardians who believe their child has provided us with personal information should contact us.</p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>9. International Data Transfers</h4>
                                <p>Your information may be transferred to and maintained on servers located outside your country. By using our services, you consent to such transfers. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.</p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>10. Changes to This Privacy Policy</h4>
                                <p>We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes by:</p>
                                <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
                                    <li style={{ marginBottom: '6px' }}>Sending an email to the address associated with your account</li>
                                    <li style={{ marginBottom: '6px' }}>Displaying a prominent notice within the application</li>
                                    <li style={{ marginBottom: '6px' }}>Updating the "Last updated" date at the top of this policy</li>
                                </ul>
                                <p style={{ marginTop: '8px' }}>We encourage you to review this Privacy Policy periodically.</p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>11. Contact Information</h4>
                                <p>If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us:</p>
                                <div style={{ backgroundColor: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', marginTop: '8px' }}>
                                    <p style={{ margin: '4px 0' }}><strong>General Inquiries:</strong> <a href="mailto:support@petshield.com" style={{ color: '#3d67ee', textDecoration: 'none' }}>support@petshield.com</a></p>
                                    <p style={{ margin: '4px 0' }}><strong>Phone:</strong> +63 905 457 0190</p>
                                    <p style={{ margin: '4px 0' }}><strong>Address (Main Branch):</strong> 99 Gen. Espino St. Cor. Col. Bravo St. Central Signal Village, Taguig, Philippines, 1633</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f7ff', borderRadius: '8px', borderLeft: '4px solid #3d67ee' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#1a1a2e' }}>
                                    <strong>Data Privacy Notice:</strong> By using PetShield, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
                                </p>
                            </div>
                        </div>
                        <div
                            style={{
                                padding: '16px 24px',
                                borderTop: '2px solid #eef4ff',
                                display: 'flex',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                style={{
                                    background: 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                }}
                            >
                                Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
