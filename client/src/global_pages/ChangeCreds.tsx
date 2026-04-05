import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IoAtOutline, IoLockClosedOutline } from 'react-icons/io5'

const API_URL = 'http://localhost:5000'

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

    if (!username.trim()) {
      setMessage({ text: 'Username cannot be empty.', type: 'error' })
      return
    }

    if (!password || password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', type: 'error' })
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
          username: username.trim(),
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

  const messageStyles: Record<'success' | 'error' | 'info', React.CSSProperties> = {
    success: {
      color: '#2e7d32',
      backgroundColor: '#e8f5e8',
      border: '1px solid #c3e6c3',
    },
    error: {
      color: '#d32f2f',
      backgroundColor: '#ffebee',
      border: '1px solid #ffcdd2',
    },
    info: {
      color: '#1e4ecb',
      backgroundColor: '#eef3ff',
      border: '1px solid #c9d8ff',
    },
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, #ffffff 0%, #3d67ee 100%)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '60px 80px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '500px',
          width: '90%',
        }}
      >
        <h2 style={{ fontWeight: '600', fontSize: '30px', margin: '0 0 8px 0', color: '#333' }}>
          Set Your New Credentials
        </h2>
        <p style={{ fontSize: '16px', margin: '0 0 20px 0', color: '#555' }}>
          Create the username and password you will use for future employee logins.
        </p>

        {employeeEmail && (
          <div style={{ fontSize: '13px', color: 'rgba(0, 0, 0, 0.62)', marginBottom: '16px' }}>
            Account email: <strong>{employeeEmail}</strong>
          </div>
        )}

        {message && (
          <div
            style={{
              ...messageStyles[message.type],
              padding: '12px 15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {message.text}
          </div>
        )}

        {validating ? (
          <div style={{ fontSize: '14px', color: '#555' }}>Validating your setup link...</div>
        ) : tokenValid ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                backgroundColor: 'rgba(95, 95, 95, 0.17)',
                border: '1px solid #5f5f5f',
                borderRadius: '8px',
                padding: '10px 15px',
                marginBottom: '15px',
                boxSizing: 'border-box',
              }}
            >
              <IoAtOutline size={20} color="#5f5f5f" style={{ marginRight: '10px' }} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14px',
                  color: '#333',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                backgroundColor: 'rgba(95, 95, 95, 0.17)',
                border: '1px solid #5f5f5f',
                borderRadius: '8px',
                padding: '10px 15px',
                marginBottom: '25px',
                boxSizing: 'border-box',
              }}
            >
              <IoLockClosedOutline size={20} color="#5f5f5f" style={{ marginRight: '10px' }} />
              <input
                type="password"
                placeholder="New Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14px',
                  color: '#333',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '50%',
                background: loading ? '#999' : 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)',
                border: 'none',
                borderRadius: '8px',
                padding: '15px 20px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(61, 103, 238, 0.3)',
              }}
            >
              {loading ? 'Updating...' : 'Update Credentials'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            style={{
              width: '50%',
              background: 'linear-gradient(135deg, #3db6ee, #3d67ee, #0738D9, #0f3bca)',
              border: 'none',
              borderRadius: '8px',
              padding: '15px 20px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  )
}
