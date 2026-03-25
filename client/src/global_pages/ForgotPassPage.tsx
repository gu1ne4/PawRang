import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoKeyOutline, IoMailOutline, IoAlertCircle, IoBugOutline, IoInformationCircle } from 'react-icons/io5';

export default function ForgetPassPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleRequestOTP = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    
    console.log('🔄 STEP 1: Starting password reset process');
    console.log('📧 Email entered:', email);
    
    try {
      const API_URL = 'http://localhost:5000'; // Updated to match Flask backend port
      
      console.log('🔄 STEP 2: Sending request to server');
      console.log('🌐 URL:', `${API_URL}/request-password-reset`);
      
      const response = await fetch(`${API_URL}/request-password-reset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email }),
      });

      console.log('🔄 STEP 3: Got response from server');
      console.log('📊 Status:', response.status);
      console.log('📊 OK?', response.ok);
      
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok) {
        console.log('✅ STEP 4: Request successful!');
        console.log('👤 User type:', data.userType);
        console.log('🔑 OTP:', data.otp);
        
        // Navigate to OTP verification page with React Router state
        navigate('/ChangePassOTP', { 
          state: {
            email, 
            userType: data.userType,
            otp: data.otp
          }
        });
      } else {
        console.log('❌ STEP 4: Request failed');
        console.log('❌ Error:', data.error);
        window.alert(`Request Failed\n\n${data.error || 'Failed to send OTP. Please try again.'}`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      window.alert(
        'Network Error\n\nCannot connect to server. Please check:\n\n1. Server is running\n2. Correct URL (http://localhost:5000)\n3. Your internet connection'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <div style={{ 
        flex: 1, 
        padding: '20px 24px',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{ 
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '40px',
            padding: '8px 12px 8px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <IoArrowBack size={24} color="#3d67ee" />
          <span style={{ color: '#3d67ee', fontSize: '16px', fontWeight: '500' }}>
            Back to Login
          </span>
        </button>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '30px', 
              backgroundColor: '#eef2ff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <IoKeyOutline size={30} color="#3d67ee" />
            </div>
            
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '12px',
              textAlign: 'center',
              margin: '0 0 12px 0'
            }}>
              Reset Password
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: '#666',
              textAlign: 'center',
              lineHeight: '24px',
              maxWidth: '300px',
              margin: 0
            }}>
              Enter your email address and we'll send you an OTP to reset your password.
            </p>
          </div>

          {/* Email Input */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '8px',
              paddingLeft: '4px'
            }}>
              Email Address
            </div>
            
            <div style={{
              border: `1px solid ${emailError ? '#ff4444' : '#ddd'}`,
              borderRadius: '12px',
              backgroundColor: '#f8f9fa',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <IoMailOutline size={20} color="#888" style={{ marginRight: '12px' }} />
              <input
                style={{
                  flex: 1,
                  padding: '16px 0',
                  fontSize: '16px',
                  color: '#333',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%'
                }}
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {emailError && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', paddingLeft: '4px' }}>
                <IoAlertCircle size={16} color="#ff4444" style={{ marginRight: '6px' }} />
                <span style={{ color: '#ff4444', fontSize: '14px' }}>{emailError}</span>
              </div>
            )}
          </div>

          {/* Send OTP Button */}
          <button
            style={{
              backgroundColor: '#3d67ee',
              borderRadius: '12px',
              padding: '18px 0',
              border: 'none',
              width: '100%',
              marginBottom: '24px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={handleRequestOTP}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
            ) : (
              <span style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Send OTP
              </span>
            )}
          </button>

          {/* Development Testing Info */}
          {import.meta.env.DEV && (
            <div style={{
              backgroundColor: '#fff8e1',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #ffd54f',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <IoBugOutline size={20} color="#ff9800" style={{ marginRight: '10px', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#ff9800',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Development Testing
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    lineHeight: '18px'
                  }}>
                    • Check server console for logs<br />
                    • Use real email from database<br />
                    • Check browser console for network logs
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div style={{
            backgroundColor: '#f0f7ff',
            borderRadius: '12px',
            padding: '16px',
            borderLeft: '4px solid #3d67ee'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <IoInformationCircle size={20} color="#3d67ee" style={{ marginRight: '10px', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#3d67ee',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  What to expect
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#555',
                  lineHeight: '20px'
                }}>
                  • Check your email inbox (and spam folder) for the OTP<br />
                  • OTP will expire in 15 minutes<br />
                  • Can't find the email? Click resend in the next step<br />
                  • System will automatically detect your account type
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
            Having trouble? Contact support@furtopia.com
          </p>
        </div>
      </div>
    </div>
  );
}