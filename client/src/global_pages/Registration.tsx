import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API_URL from '../API'
import './UserAuthStylesheet.css'
import { Mail, User, Phone, Lock } from 'lucide-react'
import UserAuthVisual, { UserAuthPoweredBy } from './UserAuthVisual'
import petShieldLogo from '../assets/PetshieldLogo.png'

type ButtonState = 'default' | 'loading' | 'success' | 'error'

export default function Registration() {
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

    function validateAll() {
        handleEmailChange(getEmail)
        handleUsernameChange(getUsername)
        handleFirstNameChange(getFirstName)
        handleLastNameChange(getLastName)
        handleContactChange(getContactNumber)
        handlePasswordChange(getPassword)
        handleConfirmPasswordChange(getPasswordConfirm)

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
            getPasswordConfirm === getPassword
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
        <div className="main">
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

                        <button className={`button loginButton--${buttonState}`} onClick={registrationHandler} disabled={isDisabled}>
                            {renderButtonContent()}
                        </button>

                        <div className="authNavigatorGroup">
                            <button className='pageNavigator' onClick={() => nav("/login")}>
                                <p>Already have an account? <strong style={{ color: '#3d67ee' }}>Login</strong></p>
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
            <UserAuthPoweredBy />
        </div>
    )
}
