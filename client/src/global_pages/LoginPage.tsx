import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBackOutline, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import { supabase } from '../supabaseClient'; 

// Import the CSS file we just created!
import './StyleSheet.css'; 

// Assets
import logoImg from '../assets/AgsikapLogo-Temp.png';
import bgGif from '../assets/AgsikapBG-Gif.gif';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { fromPasswordReset, resetMessage } = location.state || {};
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'error', 
    onDismiss: null as (() => void) | null
  });

  const [errors, setErrors] = useState({ username: '', password: '' });
  const [touched, setTouched] = useState({ username: false, password: false });

  const validationRules = {
    username: { minLength: 3, maxLength: 20, required: true },
    password: { minLength: 6, maxLength: 30, required: true }
  };

  const showPopup = (title: string, message: string, type = 'error', onDismiss: (() => void) | null = null) => {
    setModalConfig({ title, message, type, onDismiss });
    setModalVisible(true);
  };

  const handleClosePopup = () => {
    setModalVisible(false);
    if (modalConfig.onDismiss) {
      modalConfig.onDismiss();
    }
  };

  const validateField = (fieldName: 'username' | 'password', value: string) => {
    const rules = validationRules[fieldName];
    if (rules.required && !value.trim()) return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    else if (value.length > 0 && value.length < rules.minLength) return `At least ${rules.minLength} characters`;
    else if (value.length > rules.maxLength) return `Max ${rules.maxLength} characters`;
    return '';
  };

  useEffect(() => {
    if (touched.username) {
      setErrors(prev => ({...prev, username: validateField('username', username)}));
    }
  }, [username, touched.username]);

  useEffect(() => {
    if (touched.password) {
      setErrors(prev => ({...prev, password: validateField('password', password)}));
    }
  }, [password, touched.password]);

  useEffect(() => {
    if (fromPasswordReset && resetMessage) {
      showPopup('Success', resetMessage, 'success');
    }
  }, [fromPasswordReset, resetMessage]);

  const getFieldStatus = (fieldName: 'username' | 'password', value: string) => {
    if (!touched[fieldName]) return 'neutral';
    const error = validateField(fieldName, value);
    if (error) return 'invalid';
    return 'valid';
  };

  const usernameStatus = getFieldStatus('username', username);
  const passwordStatus = getFieldStatus('password', password);

  const isFormValid = () => {
    return !validateField('username', username) && !validateField('password', password);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (text.length <= validationRules.username.maxLength) {
      setUsername(text);
      if (!touched.username) setTouched(prev => ({...prev, username: true}));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (text.length <= validationRules.password.maxLength) {
      setPassword(text);
      if (!touched.password) setTouched(prev => ({...prev, password: true}));
    }
  };

  const handleBlur = (fieldName: 'username' | 'password') => {
    setTouched(prev => ({...prev, [fieldName]: true}));
    setErrors(prev => ({...prev, [fieldName]: validateField(fieldName, fieldName === 'username' ? username : password)}));
  };

  // THE SUPABASE LOGIN LOGIC
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

    try {
      let userEmail = '';
      let userDetails: any = null;
      let userType = '';

      // STEP 1: Find the user's email by their username
      const { data: empData, error: empError } = await supabase
        .from('employee_accounts')
        .select('*')
        .eq('username', username)
        .single();

      if (empData) {
        userEmail = empData.email;
        userDetails = empData;
        userType = 'employee';
      } else {
        const { data: patData, error: patError } = await supabase
          .from('patient_account')
          .select('*')
          .eq('username', username)
          .single();
        
        if (patData) {
          userEmail = patData.email;
          userDetails = patData;
          userType = 'patient';
        }
      }

      if (!userEmail) {
        showPopup('Login Failed', "Invalid Username or Password.", 'error');
        setLoading(false);
        return;
      }

      if (userDetails.status === 'Disabled' || userDetails.status === 'Inactive') {
        showPopup('Account Disabled', "Your account has been disabled. Please contact support.", 'error');
        setLoading(false);
        return;
      }

      // STEP 2: Authenticate securely with Supabase using their email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          showPopup('Email Not Verified', 'Please check your inbox and verify your email before logging in.', 'info');
        } else {
          showPopup('Login Failed', 'Invalid Username or Password', 'error');
        }
        setLoading(false);
        return;
      }

      // STEP 3: Setup the user session
      const sessionUser = {
        id: userDetails.id || userDetails.pk,
        username: userDetails.username,
        fullname: userType === 'employee' 
          ? `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim() 
          : `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim(),
        role: userDetails.role || (userType === 'patient' ? 'User' : 'Unknown'),
        userType: userType,
      };

      localStorage.setItem('userSession', JSON.stringify(sessionUser));

      // STEP 4: Direct Routing (No redundant change-creds check!)
      if (userType === 'employee') {
        const message = fromPasswordReset 
          ? `Password updated successfully! Welcome back ${sessionUser.fullname}!`
          : `Welcome back ${sessionUser.fullname}!`;
        
        showPopup('Success', message, 'success', () => {
          const userRole = sessionUser.role; 
          if (userRole === 'Admin') {
            navigate("/Home", { replace: true }); 
          } else if (userRole === 'Veterinarian' || userRole === 'Receptionist') {
            navigate("/DoctorHomePage", { replace: true }); 
          } else {
            navigate("/Accounts", { replace: true }); 
          }
        });
      } else {
        const message = fromPasswordReset 
          ? `Password updated successfully! Welcome ${sessionUser.fullname}!`
          : `Welcome ${sessionUser.fullname}!`;
        
        showPopup('Success', message, 'success', () => {
          navigate("/UserHome", { replace: true });
        });
      }

    } catch (error) {
      console.error(error);
      const msg = 'Network Error: Could not connect to the database.';
      showPopup('Connection Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="loginContainer">
        
        {/* LEFT SIDE */}
        <div 
          className="gifContainer" 
          style={{ 
            backgroundImage: `url(${bgGif})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            position: 'relative'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1 }}></div>
          
          <div className="gifOverlay" style={{ zIndex: 2, display: 'flex', flexDirection: 'column' }}>
            <img 
              src={logoImg} 
              style={{ width: '80px', height: '80px', marginBottom: '20px', objectFit: 'contain' }} 
              alt="Logo" 
            />
            <div style={{ marginTop: '50px' }}>
              <div className="whiteFont">Hello,</div>
              <div className="whiteFont" style={{ fontStyle: 'italic', fontWeight: '600' }}>welcome!</div>
              <div style={{ color: '#e0e0e0', marginTop: '30px', fontSize: '14px', lineHeight: '22px', maxWidth: '400px' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="loginSection">
          <button
            onClick={() => navigate('/UserHome')}
            style={{ 
              alignSelf: 'flex-start', marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0
            }}
          >
            <IoArrowBackOutline size={18} color="#3d67ee" />
            <span style={{ color: '#3d67ee', fontSize: '14px', fontWeight: '500' }}>Return to Home</span>
          </button>

          <h1 className="agsikapTitle">Furtopia</h1>
          <h2 className="loginHeader">Log in to your Account</h2>
          <p className="loginSubtext">
            Sign in to check appointments, receive updates, and take care of your pets with ease!
          </p>

          <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '400px' }}>
            
            {/* Username Field */}
            <div className="inputGroup" style={{ backgroundColor: 'white' }}>
              <input
                className={`inputField ${usernameStatus === 'invalid' ? 'inputError' : usernameStatus === 'valid' ? 'inputValid' : ''}`}
                placeholder="Username"
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => handleBlur('username')}
                maxLength={validationRules.username.maxLength}
              />
              <div className="fieldFeedbackContainer">
                <div className="errorContainer">
                  {usernameStatus === 'invalid' && touched.username && (
                    <span className="errorText">{errors.username}</span>
                  )}
                </div>
                <span className={`charCount ${usernameStatus === 'invalid' ? 'charCountError' : usernameStatus === 'valid' ? 'charCountValid' : ''}`}>
                  {username.length}/{validationRules.username.maxLength}
                </span>
              </div>
            </div>

            {/* Password Field */}
            <div className="inputGroup">
              <input
                className={`inputField ${passwordStatus === 'invalid' ? 'inputError' : passwordStatus === 'valid' ? 'inputValid' : ''}`}
                type="password"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                maxLength={validationRules.password.maxLength}
              />
              <div className="fieldFeedbackContainer">
                <div className="errorContainer">
                  {passwordStatus === 'invalid' && touched.password && (
                    <span className="errorText">{errors.password}</span>
                  )}
                </div>
                <span className={`charCount ${passwordStatus === 'invalid' ? 'charCountError' : passwordStatus === 'valid' ? 'charCountValid' : ''}`}>
                  {password.length}/{validationRules.password.maxLength}
                </span>
              </div>
            </div>

            {/* Login Button */}
            <button 
              type="submit"
              disabled={loading || !isFormValid()}
              className={`loginButton ${!isFormValid() ? 'loginButtonDisabled' : ''}`}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
              ) : (
                <span className="loginButtonText">Login</span>
              )}
            </button>
          </form>

          <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '400px' }}>
            <button onClick={() => navigate('/Registration')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
              Don't have an account? <span style={{ color: '#3d67ee', fontWeight: '600' }}>Sign up</span>
            </button>

            <button onClick={() => navigate('/ForgetPass')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#3d67ee', fontWeight: '500' }}>
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* --- CUSTOM POPUP MODAL --- */}
      {modalVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '300px', width: '85%', boxShadow: '0 2px 4px rgba(0,0,0,0.25)' }}>
            {modalConfig.type === 'success' ? (
              <IoCheckmarkCircle size={50} color="#4CAF50" style={{ marginBottom: '10px' }} />
            ) : modalConfig.type === 'info' ? (
              <IoAlertCircle size={50} color="#3d67ee" style={{ marginBottom: '10px' }} />
            ) : (
              <IoAlertCircle size={50} color="#F44336" style={{ marginBottom: '10px' }} />
            )}
            
            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#333', fontWeight: 'bold' }}>{modalConfig.title}</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333', textAlign: 'center' }}>{modalConfig.message}</p>
            
            <button 
              onClick={handleClosePopup}
              style={{
                backgroundColor: modalConfig.type === 'success' ? '#4CAF50' : (modalConfig.type === 'info' ? '#3d67ee' : '#F44336'),
                color: 'white', border: 'none', padding: '10px 30px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}