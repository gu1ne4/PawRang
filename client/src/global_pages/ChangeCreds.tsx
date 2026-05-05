import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AtSign, Eye, EyeOff, KeyRound, UserCog } from 'lucide-react'
import './UserAuthStylesheet.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000'
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 64

type MessageState = {
  text: string
  type: 'success' | 'error' | 'info'
} | null

type EmployeeSetupResponse = {
  employee?: {
    id?: string
    email?: string
    first_name?: string
    last_name?: string
    username?: string
    is_initial_login?: boolean
  }
  error?: string
}

export default function ChangeCreds() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [employeeEmail, setEmployeeEmail] = useState('')
  const [message, setMessage] = useState<MessageState>(null)
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setMessage({ text: 'This setup link is missing a token.', type: 'error' })
        setTokenValid(false)
        setValidating(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/employee-setup/validate?token=${encodeURIComponent(token)}`)
        const data: EmployeeSetupResponse = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || 'This setup link is invalid or expired.')
        }

        setEmployeeEmail(data.employee?.email || '')
        setUsername(data.employee?.username || '')
        setTokenValid(true)
        setMessage({ text: 'Setup link verified. Please choose your new credentials.', type: 'info' })
      } catch (error) {
        const text = error instanceof Error ? error.message : 'This setup link is invalid or expired.'
        setMessage({ text, type: 'error' })
        setTokenValid(false)
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedUsername = username.trim()
    const nextUsernameError = validateUsername(trimmedUsername)
    const nextPasswordError = validatePassword(password)

    setUsernameError(nextUsernameError)
    setPasswordError(nextPasswordError)

    if (nextUsernameError || nextPasswordError) {
      setMessage({ text: 'Please fix the highlighted fields before continuing.', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/api/employee-setup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username: trimmedUsername,
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while updating credentials.')
      }

      setMessage({ text: 'Credentials updated successfully! Redirecting to login...', type: 'success' })

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1800)
    } catch (error) {
      const text = error instanceof Error ? error.message : 'An error occurred while updating credentials.'
      setMessage({ text, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function validateUsername(value: string) {
    if (!value) return 'Username cannot be empty.'
    if (value.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`
    if (value.length > USERNAME_MAX_LENGTH) return `Username cannot exceed ${USERNAME_MAX_LENGTH} characters.`
    return ''
  }

  function validatePassword(value: string) {
    if (!value) return 'New password cannot be empty.'
    if (value.length < PASSWORD_MIN_LENGTH) return `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    if (value.length > PASSWORD_MAX_LENGTH) return `New password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`
    if (!/[A-Z]/.test(value)) return 'New password must contain at least 1 uppercase letter.'
    if (!/[a-z]/.test(value)) return 'New password must contain at least 1 lowercase letter.'
    if (!/\d/.test(value)) return 'New password must contain at least 1 number.'
    return ''
  }

  return (
    <div className="resetMain">
      <div className="resetCard">
        <div className="resetHeader">
          <div className="resetIconWrapper">
            <UserCog size={28} color="#3d67ee" />
          </div>
          <h2>Set Your New Credentials</h2>
          <p>Create the username and password you will use for future employee logins.</p>
        </div>

        {employeeEmail && (
          <div className="credentialEmailBadge">
            Account email: <strong>{employeeEmail}</strong>
          </div>
        )}

        {message && (
          <div
            className={
              message.type === 'success'
                ? 'resetServerSuccess'
                : message.type === 'error'
                  ? 'resetServerError'
                  : 'resetServerInfo'
            }
          >
            <p>{message.text}</p>
          </div>
        )}

        {validating ? (
          <div className="resetStatusText">Validating your setup link...</div>
        ) : tokenValid ? (
          <form onSubmit={handleSubmit} className="changeCredsForm">
            <div className="resetInputContainer">
              <label className={`resetInputLabel${usernameError ? ' errorLabel' : ''}`} htmlFor="employee-username">
                Username <span className="errorAsterisk">*</span>
              </label>
              <div className="resetInputFieldContainer">
                <AtSign className="resetInputIcon" />
                <input
                  id="employee-username"
                  className={`resetInputField${usernameError ? ' errorField' : ''}`}
                  type="text"
                  placeholder="Username"
                  value={username}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setUsernameError('')
                  }}
                />
              </div>
              {usernameError && <p className="errorMessage">{usernameError}</p>}
            </div>

            <div className="resetInputContainer">
              <label className={`resetInputLabel${passwordError ? ' errorLabel' : ''}`} htmlFor="employee-password">
                New Password <span className="errorAsterisk">*</span>
              </label>
              <div className="resetInputFieldContainer">
                <KeyRound className="resetInputIcon" />
                <input
                  id="employee-password"
                  className={`resetInputField resetInputFieldWithAction${passwordError ? ' errorField' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  value={password}
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={PASSWORD_MAX_LENGTH}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError('')
                  }}
                />
                <button
                  type="button"
                  className="passwordVisibilityButton"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && <p className="errorMessage">{passwordError}</p>}
              <p className="passwordRequirementText">
                8-64 characters with uppercase, lowercase, and number.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="resetButton"
            >
              {loading ? 'Updating...' : 'Update Credentials'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="resetButton"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  )
}
