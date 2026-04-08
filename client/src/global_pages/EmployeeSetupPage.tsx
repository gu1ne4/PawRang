import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import './UserAuthStylesheet.css';
import API_URL from '../API';
import { supabase } from '../supabaseClient';

interface ProfileResponse {
  id: string;
  email?: string;
  username?: string;
  fullname?: string;
  role?: string;
}

type ButtonState = 'default' | 'loading' | 'success' | 'error';

export default function EmployeeSetupPage() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();

  const [resolvedUserId, setResolvedUserId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [buttonState, setButtonState] = useState<ButtonState>('default');

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    setUsername(cleaned);

    if (!cleaned.trim()) {
      setUsernameError('Username is required.');
    } else if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
    } else {
      setUsernameError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);

    if (!value.trim()) {
      setPasswordError('Password is required.');
    } else if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
    } else {
      setPasswordError('');
    }

    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
    } else if (confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);

    if (!value.trim()) {
      setConfirmPasswordError('Please confirm your password.');
    } else if (value !== password) {
      setConfirmPasswordError('Passwords do not match.');
    } else {
      setConfirmPasswordError('');
    }
  };

  const validateAll = () => {
    handleUsernameChange(username);
    handlePasswordChange(password);
    handleConfirmPasswordChange(confirmPassword);

    return (
      username.trim().length >= 3 &&
      password.length >= 8 &&
      confirmPassword === password
    );
  };

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      setIsInitializing(true);
      setServerError('');

      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const { data: userData } = await supabase.auth.getUser();
        const sessionUserId = userData.user?.id || sessionData.session?.user?.id;

        let localUserId = '';
        try {
          const storedSession = localStorage.getItem('userSession');
          if (storedSession) {
            localUserId = JSON.parse(storedSession)?.id || '';
          }
        } catch (error) {
          console.error('Failed to parse local user session:', error);
        }

        const effectiveUserId = sessionUserId || routeUserId || localUserId;

        if (!effectiveUserId) {
          if (isMounted) {
            setServerError('This setup link is invalid or has expired. Please request a new employee setup link.');
          }
          return;
        }

        if (!isMounted) return;
        setResolvedUserId(effectiveUserId);

        const response = await fetch(`${API_URL}/profile/${effectiveUserId}`);
        const data: ProfileResponse | { error?: string } = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error((data as { error?: string }).error || 'Failed to load employee profile.');
        }

        const profile = data as ProfileResponse;
        if (!isMounted) return;

        setEmail(profile.email || '');
        const suggestedUsername = profile.username && !profile.username.startsWith('temp_')
          ? profile.username
          : '';
        setUsername(suggestedUsername);
      } catch (error: any) {
        if (isMounted) {
          setServerError(error.message || 'Failed to prepare the account setup page.');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializePage();

    return () => {
      isMounted = false;
    };
  }, [routeUserId]);

  const handleSubmit = async () => {
    setServerError('');
    setServerSuccess('');

    if (!resolvedUserId) {
      setServerError('This setup link is invalid or has expired. Please request a new employee setup link.');
      setButtonState('error');
      setTimeout(() => setButtonState('default'), 600);
      return;
    }

    if (!validateAll()) {
      setButtonState('error');
      setTimeout(() => setButtonState('default'), 600);
      return;
    }

    setIsLoading(true);
    setButtonState('loading');

    try {
      const response = await fetch(`${API_URL}/employee-complete-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: resolvedUserId,
          username: username.trim(),
          new_password: password
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete account setup.');
      }

      setServerSuccess('Account setup complete. You can now log in with your new username and password.');
      setButtonState('success');

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Sign-out after setup failed:', error);
      }

      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (error: any) {
      setServerError(error.message || 'Failed to complete account setup.');
      setButtonState('error');
      setTimeout(() => setButtonState('default'), 600);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || buttonState === 'success';

  const renderButtonContent = () => {
    if (buttonState === 'loading') return <span className="loginSpinner" />;
    if (buttonState === 'success') {
      return (
        <svg className="loginCheckIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }

    return 'Complete Setup';
  };

  return (
    <div className="main">
      <div className="divisionContainers" id="divisionContainer1">
        <div className="imageBackground">
          <div className="placeholders">
            <h2>Welcome to PawRang!</h2>
            <p>Finish setting up your employee account so you can log in with your own username and password and start using the clinic system.</p>
          </div>
        </div>
      </div>

      <div className="divisionContainers">
        <div className="inputBox">
          <div className="headerContent">
            <h2>Set Up Employee Account</h2>
            <p>Choose your username and password to finish activating this employee account.</p>
          </div>

          {isInitializing ? (
            <div className="serverSuccessMessage">
              <p>Preparing your account setup...</p>
            </div>
          ) : (
            <div className="form">
              {email && (
                <div className="serverSuccessMessage" style={{ backgroundColor: '#eef2ff', borderColor: '#c7caff', color: '#3730a3' }}>
                  <p>Setting up account for <strong>{email}</strong></p>
                </div>
              )}

              {serverError && (
                <div className="serverErrorMessage">
                  <p>{serverError}</p>
                </div>
              )}

              {serverSuccess && (
                <div className="serverSuccessMessage">
                  <p>{serverSuccess}</p>
                </div>
              )}

              <div className="inputContainer">
                <p className={usernameError ? 'inputLabel errorLabel' : 'inputLabel'}>
                  Username {usernameError && <span className="errorAsterisk">*</span>}
                </p>
                <div className="inputFieldContainer">
                  <User className="inputIcons" />
                  <input
                    className={usernameError ? 'inputFields errorField' : 'inputFields'}
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                  />
                </div>
                {usernameError && <p className="errorMessage">{usernameError}</p>}
              </div>

              <div className="inputContainer">
                <p className={passwordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                  New Password {passwordError && <span className="errorAsterisk">*</span>}
                </p>
                <div className="inputFieldContainer">
                  <Lock className="inputIcons" />
                  <input
                    className={passwordError ? 'inputFields errorField' : 'inputFields'}
                    type="password"
                    placeholder="Create a new password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                  />
                </div>
                {passwordError && <p className="errorMessage">{passwordError}</p>}
              </div>

              <div className="inputContainer">
                <p className={confirmPasswordError ? 'inputLabel errorLabel' : 'inputLabel'}>
                  Confirm Password {confirmPasswordError && <span className="errorAsterisk">*</span>}
                </p>
                <div className="inputFieldContainer">
                  <Lock className="inputIcons" />
                  <input
                    className={confirmPasswordError ? 'inputFields errorField' : 'inputFields'}
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  />
                </div>
                {confirmPasswordError && <p className="errorMessage">{confirmPasswordError}</p>}
              </div>

              <button
                className={`button loginButton--${buttonState}`}
                onClick={handleSubmit}
                disabled={isDisabled}
              >
                {renderButtonContent()}
              </button>

              <button className="pageNavigator" onClick={() => navigate('/login')}>
                <p style={{ fontSize: 18 }}>Back to <strong style={{ color: '#2619e2' }}>Login</strong></p>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
