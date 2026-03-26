import React, { useState, useEffect } from 'react';
// Use a different icon approach for web
import './GlobalStyles.css';
import gifBG from '../assets/AgsikapBG-Gif.gif';
import logo from '../assets/AgsikapLogo-Temp.png';

// Types and Interfaces
interface User {
  id: string;
  username: string;
  fullname: string;
  userType: 'employee' | 'patient';
  role?: 'Admin' | 'Veterinarian' | 'Receptionist' | 'User';
  isInitialLogin?: boolean;
}

interface LoginResponse {
  ok: boolean;
  user: User;
  error?: string;
}

interface ValidationRules {
  minLength: number;
  maxLength: number;
  required: boolean;
}

interface ValidationErrors {
  username: string;
  password: string;
}

interface TouchedFields {
  username: boolean;
  password: boolean;
}

interface ModalConfig {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss?: () => void;
}

interface RouteParams {
  fromPasswordReset?: boolean;
  resetMessage?: string;
}

// Simple SVG icon components as fallback for @expo/vector-icons
const Icons = {
  ArrowBack: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="#3d67ee"/>
    </svg>
  ),
  CheckmarkCircle: ({ color }: { color: string }) => (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill={color}/>
    </svg>
  ),
  AlertCircle: ({ color }: { color: string }) => (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill={color}/>
    </svg>
  )
};

// Validation rules
const validationRules: Record<string, ValidationRules> = {
  username: { minLength: 3, maxLength: 20, required: true },
  password: { minLength: 6, maxLength: 30, required: true }
};

const GlobalLoginPage: React.FC = () => {
  // State management
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    title: '',
    message: '',
    type: 'error',
    onDismiss: undefined
  });
  const [errors, setErrors] = useState<ValidationErrors>({ username: '', password: '' });
  const [touched, setTouched] = useState<TouchedFields>({ username: false, password: false });

  // Route params simulation
  const [routeParams, setRouteParams] = useState<RouteParams>({});

  // Validation functions
  const validateField = (fieldName: string, value: string): string => {
    const rules = validationRules[fieldName];
    if (rules.required && !value.trim()) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (value.length > 0 && value.length < rules.minLength) {
      return `At least ${rules.minLength} characters`;
    }
    if (value.length > rules.maxLength) {
      return `Max ${rules.maxLength} characters`;
    }
    return '';
  };

  const getFieldStatus = (fieldName: string, value: string): 'neutral' | 'invalid' | 'valid' => {
    if (!touched[fieldName as keyof TouchedFields]) return 'neutral';
    const error = validateField(fieldName, value);
    if (error) return 'invalid';
    return 'valid';
  };

  const isFormValid = (): boolean => {
    return !validateField('username', username) && !validateField('password', password);
  };

  // Handlers
  const handleUsernameChange = (text: string): void => {
    setUsername(text);
    if (!touched.username) {
      setTouched(prev => ({ ...prev, username: true }));
    }
  };

  const handlePasswordChange = (text: string): void => {
    setPassword(text);
    if (!touched.password) {
      setTouched(prev => ({ ...prev, password: true }));
    }
  };

  const handleBlur = (fieldName: string): void => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    setErrors(prev => ({
      ...prev,
      [fieldName]: validateField(fieldName, fieldName === 'username' ? username : password)
    }));
  };

  const showPopup = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error', onDismiss?: () => void): void => {
    setModalConfig({ title, message, type, onDismiss });
    setModalVisible(true);
  };

  const handleClosePopup = (): void => {
    setModalVisible(false);
    if (modalConfig.onDismiss) {
      modalConfig.onDismiss();
    }
  };

  const handleLoginError = (serverError: string): void => {
    const errorLower = serverError.toLowerCase();
    
    if (errorLower.includes('verify your email')) {
      showPopup(
        'Email Not Verified',
        'Please check your inbox and verify your email before logging in.',
        'info'
      );
    } else if (errorLower.includes('found') || errorLower.includes('exist')) {
      showPopup('Login Failed', 'Account not found.', 'error');
    } else if (errorLower.includes('disabled') || errorLower.includes('inactive')) {
      showPopup('Account Disabled', 'Your account has been disabled. Please contact support.', 'error');
    } else {
      showPopup('Login Failed', 'Invalid Username or Password', 'error');
    }
  };

  const handleLogin = async (): Promise<void> => {
    setTouched({ username: true, password: true });
    
    const usernameError = validateField('username', username);
    const passwordError = validateField('password', password);
    
    if (usernameError || passwordError) {
      setErrors({ username: usernameError, password: passwordError });
      const firstError = usernameError || passwordError;
      showPopup('Validation Error', firstError, 'error');
      return;
    }

    setLoading(true);
    
    // Determine API URL based on environment
    // Check if we're in a browser environment
    const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000' 
      : 'https://api.yourdomain.com';

    try {
      // Try unified login endpoint
      const response = await fetch(`${baseUrl}/unified-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok) {
        // Save session to localStorage
        localStorage.setItem('userSession', JSON.stringify(data.user));
        
        // Handle employee login
        if (data.user.userType === 'employee') {
          if (data.user.isInitialLogin && !routeParams.fromPasswordReset) {
            showPopup('First Login', 'Please update your credentials to continue.', 'info', () => {
              window.location.href = `/update-account/${data.user.id}`;
            });
          } else {
            const message = routeParams.fromPasswordReset 
              ? `Password updated successfully! Welcome back ${data.user.fullname}!`
              : `Welcome back ${data.user.fullname}!`;
            
            showPopup('Success', message, 'success', () => {
              const userRole = data.user.role;
              
              if (userRole === 'Admin') {
                window.location.href = '/home';
              } else if (userRole === 'Veterinarian' || userRole === 'Receptionist') {
                window.location.href = '/doctor-home';
              } else {
                window.location.href = '/accounts';
              }
            });
          }
        } else {
          // Patient login
          const message = routeParams.fromPasswordReset 
            ? `Password updated successfully! Welcome ${data.user.fullname}!`
            : `Welcome ${data.user.fullname}!`;
          
          showPopup('Success', message, 'success', () => {
            window.location.href = '/user-home';
          });
        }
      } else {
        // Fallback to original login endpoint
        try {
          const fallbackResponse = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const fallbackData: LoginResponse = await fallbackResponse.json();

          if (fallbackResponse.ok) {
            localStorage.setItem('userSession', JSON.stringify(fallbackData.user));
            
            if (fallbackData.user.isInitialLogin) {
              showPopup('First Login', 'Please update your credentials to continue.', 'success', () => {
                window.location.href = `/update-account/${fallbackData.user.id}`;
              });
            } else {
              showPopup('Success', `Welcome back, ${fallbackData.user.username}!`, 'success', () => {
                const userRole = fallbackData.user.role;
                
                if (userRole === 'Admin') {
                  window.location.href = '/home';
                } else if (userRole === 'Veterinarian' || userRole === 'Receptionist') {
                  window.location.href = '/home';
                } else if (userRole === 'User') {
                  window.location.href = '/user-home';
                } else {
                  window.location.href = '/login';
                }
              });
            }
          } else {
            handleLoginError(fallbackData.error || '');
          }
        } catch (fallbackError) {
          handleLoginError(data.error || '');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      showPopup('Connection Error', 'Network Error: Make sure server is running!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToHome = (): void => {
    window.location.href = '/';
  };

  const handleSignUp = (): void => {
    window.location.href = '/register';
  };

  const handleForgotPassword = (): void => {
    window.location.href = '/forgot-password';
  };

  // Effects
  useEffect(() => {
    if (touched.username) {
      setErrors(prev => ({ ...prev, username: validateField('username', username) }));
    }
  }, [username, touched.username]);

  useEffect(() => {
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validateField('password', password) }));
    }
  }, [password, touched.password]);

  // Simulate route params effect
  useEffect(() => {
    // This would normally come from React Navigation
    const params: RouteParams = {};
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('fromPasswordReset') === 'true') {
        params.fromPasswordReset = true;
        params.resetMessage = urlParams.get('resetMessage') || 'Password updated successfully!';
      }
    }
    
    setRouteParams(params);
  }, []);

  // Show reset message effect
  useEffect(() => {
    if (routeParams.fromPasswordReset && routeParams.resetMessage) {
      showPopup('Success', routeParams.resetMessage, 'success');
    }
  }, [routeParams.fromPasswordReset, routeParams.resetMessage]);

  const usernameStatus = getFieldStatus('username', username);
  const passwordStatus = getFieldStatus('password', password);

  return (
    <div className="container">
      <div className="loginContainer">
        {/* LEFT SIDE - GIF Container */}
        <div className="gifContainer">
          <img 
            src={gifBG}
            alt="Background"
            className="gifBackground"
          />
          <div className="gifOverlay">
            <img 
              src={logo}
              alt="Logo"
              className="logo"
            />
            <div style={{ marginTop: '50px' }}>
              <h1 className="whiteFont">Hello,</h1>
              <h2 className="whiteFont" style={{ fontStyle: 'italic', fontWeight: 600 }}>welcome!</h2>
              <p style={{ color: '#e0e0e0', marginTop: '30px', fontSize: '14px', lineHeight: '22px', maxWidth: '400px' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Login Section */}
        <div className="loginSection">
          <button
            onClick={handleReturnToHome}
            className="returnHomeLink"
          >
            <Icons.ArrowBack />
            <span>Return to Home</span>
          </button>

          <h1 className="agsikapTitle">Furtopia</h1>
          <h2 className="loginHeader">Log in to your Account</h2>
          <p className="loginSubtext">
            Sign in to check appointments, receive updates, and take care of your pets with ease!
          </p>

          {/* Username Field */}
          <div className="inputGroup">
            <input
              type="text"
              className={`inputField ${
                usernameStatus === 'invalid' ? 'inputError' : ''
              } ${usernameStatus === 'valid' ? 'inputValid' : ''}`}
              placeholder="Username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              onBlur={() => handleBlur('username')}
              maxLength={validationRules.username.maxLength}
            />
            <div className="fieldFeedbackContainer">
              <div className="errorContainer">
                {usernameStatus === 'invalid' && touched.username && (
                  <span className="errorText">{errors.username}</span>
                )}
              </div>
              <span className={`charCount ${
                usernameStatus === 'invalid' ? 'charCountError' : ''
              } ${usernameStatus === 'valid' ? 'charCountValid' : ''}`}>
                {username.length}/{validationRules.username.maxLength}
              </span>
            </div>
          </div>

          {/* Password Field */}
          <div className="inputGroup">
            <input
              type="password"
              className={`inputField ${
                passwordStatus === 'invalid' ? 'inputError' : ''
              } ${passwordStatus === 'valid' ? 'inputValid' : ''}`}
              placeholder="Password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              onBlur={() => handleBlur('password')}
              maxLength={validationRules.password.maxLength}
            />
            <div className="fieldFeedbackContainer">
              <div className="errorContainer">
                {passwordStatus === 'invalid' && touched.password && (
                  <span className="errorText">{errors.password}</span>
                )}
              </div>
              <span className={`charCount ${
                passwordStatus === 'invalid' ? 'charCountError' : ''
              } ${passwordStatus === 'valid' ? 'charCountValid' : ''}`}>
                {password.length}/{validationRules.password.maxLength}
              </span>
            </div>
          </div>

          {/* Login Button */}
          <button 
            className={`loginButton ${!isFormValid() ? 'loginButtonDisabled' : ''}`}
            onClick={handleLogin}
            disabled={loading || !isFormValid()}
          >
            {loading ? <div className="loadingSpinner" /> : <span className="loginButtonText">Login</span>}
          </button>

          <div className="authLinks">
            <button onClick={handleSignUp} className="authLink">
              Don't have an account?
              <span className="authLinkHighlight"> Sign up</span>
            </button>

            <button onClick={handleForgotPassword} className="authLink">
              <span className="authLinkHighlight">Forgot Password?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Modal */}
      {modalVisible && (
        <div className="modalOverlay" onClick={handleClosePopup}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            {modalConfig.type === 'success' ? (
              <Icons.CheckmarkCircle color="#4CAF50" />
            ) : (
              <Icons.AlertCircle color="#F44336" />
            )}
            <h3 className="modalTitle">{modalConfig.title}</h3>
            <p className="modalMessage">{modalConfig.message}</p>
            <button
              className={`modalButton ${
                modalConfig.type === 'success' ? 'modalButtonSuccess' : 'modalButtonError'
              }`}
              onClick={handleClosePopup}
            >
              <span className="modalButtonText">OK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalLoginPage;