import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoAlertCircle, IoShieldCheckmarkOutline, IoInformationCircle } from 'react-icons/io5';

export default function ChangePass() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // React Router state replacement for route.params
  const { email, otp } = location.state || { email: '', otp: '' };
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswords = () => {
    const newErrors = { newPassword: '', confirmPassword: '' };
    let isValid = true;

    if (newPassword.length < 8 || newPassword.length > 30) {
      newErrors.newPassword = 'Password must be 8-30 characters';
      isValid = false;
    }

    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleResetPassword = async () => {
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const API_URL = 'http://localhost:5000'; // Updated to 5000 for Flask backend
      
      console.log('🔄 STEP 1: Attempting password reset');
      console.log('📧 Email:', email);
      console.log('🔑 OTP being used:', otp);
      console.log('🔐 New password length:', newPassword.length);
      
      // Now attempt reset
      console.log('🔄 STEP 2: Calling reset-password endpoint');
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          otp, 
          newPassword
        }),
      });

      console.log('🔄 STEP 3: Got reset response');
      console.log('📊 Status:', response.status);
      
      const data = await response.json();
      console.log('📦 Reset response data:', data);

      if (response.ok) {
        console.log('✅ Password reset successful!');
        
        // Navigate to Login with a flag indicating this is a password reset
        navigate('/Login', { 
          state: {
            fromPasswordReset: true,
            resetMessage: 'Password reset successfully! Please login with your new password.'
          }
        });
      } else {
        console.log('❌ Password reset failed:', data.error);
        
        // Show detailed error
        window.alert(`Reset Failed\n\n${data.error}\n\nPossible reasons:\n1. OTP expired\n2. OTP already used\n3. Wrong OTP\n4. Database issue\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      window.alert('Network Error\n\nCannot connect to server.\n\nMake sure:\n1. Server is running\n2. URL is correct\n3. Network is working');
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
            Back
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
              <IoLockClosedOutline size={30} color="#3d67ee" />
            </div>
            
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '12px',
              textAlign: 'center',
              margin: '0 0 12px 0'
            }}>
              Create New Password
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: '#666',
              textAlign: 'center',
              lineHeight: '24px',
              maxWidth: '300px',
              margin: 0
            }}>
              Enter your new password below
            </p>
          </div>

          {/* Email Display */}
          <div style={{ 
            backgroundColor: '#f0f7ff', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            border: '1px solid #d0e0ff'
          }}>
            <div style={{ 
              textAlign: 'center', 
              color: '#3d67ee', 
              fontWeight: '600',
              fontSize: '15px'
            }}>
              {email || 'No email provided'}
            </div>
          </div>

          {/* New Password Input */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '8px',
              paddingLeft: '4px'
            }}>
              New Password
            </div>
            
            <div style={{
              border: `1px solid ${errors.newPassword ? '#ff4444' : '#ddd'}`,
              borderRadius: '12px',
              backgroundColor: '#f8f9fa',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <IoLockClosedOutline size={20} color="#888" style={{ marginRight: '12px' }} />
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
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors({...errors, newPassword: ''});
                }}
              />
              <button 
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                type="button"
              >
                {showNewPassword ? <IoEyeOffOutline size={20} color="#888" /> : <IoEyeOutline size={20} color="#888" />}
              </button>
            </div>
            
            {errors.newPassword && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', paddingLeft: '4px' }}>
                <IoAlertCircle size={16} color="#ff4444" style={{ marginRight: '6px' }} />
                <span style={{ color: '#ff4444', fontSize: '14px' }}>{errors.newPassword}</span>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '8px',
              paddingLeft: '4px'
            }}>
              Confirm New Password
            </div>
            
            <div style={{
              border: `1px solid ${errors.confirmPassword ? '#ff4444' : '#ddd'}`,
              borderRadius: '12px',
              backgroundColor: '#f8f9fa',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <IoLockClosedOutline size={20} color="#888" style={{ marginRight: '12px' }} />
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
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({...errors, confirmPassword: ''});
                }}
              />
              <button 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                type="button"
              >
                {showConfirmPassword ? <IoEyeOffOutline size={20} color="#888" /> : <IoEyeOutline size={20} color="#888" />}
              </button>
            </div>
            
            {errors.confirmPassword && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', paddingLeft: '4px' }}>
                <IoAlertCircle size={16} color="#ff4444" style={{ marginRight: '6px' }} />
                <span style={{ color: '#ff4444', fontSize: '14px' }}>{errors.confirmPassword}</span>
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div style={{
            backgroundColor: '#fff8e1',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #ffd54f',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <IoShieldCheckmarkOutline size={20} color="#ff9800" style={{ marginRight: '10px', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#ff9800',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  Password Requirements
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666',
                  lineHeight: '20px'
                }}>
                  • Must be 8-30 characters long<br />
                  • Both passwords must match exactly<br />
                  • Avoid using common passwords
                </div>
              </div>
            </div>
          </div>

          {/* Reset Password Button */}
          <button
            style={{
              backgroundColor: '#3d67ee',
              borderRadius: '12px',
              padding: '18px 0',
              border: 'none',
              width: '100%',
              marginBottom: '16px',
              opacity: (loading || !newPassword || !confirmPassword) ? 0.7 : 1,
              cursor: (loading || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={handleResetPassword}
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
            ) : (
              <span style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Reset Password
              </span>
            )}
          </button>

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
                  Important Information
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#555',
                  lineHeight: '20px'
                }}>
                  • Your password will be updated immediately<br />
                  • You'll be redirected to login page<br />
                  • Use your new password for all future logins<br />
                  • For security, don't share your password with anyone
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: '20px', paddingBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
            Having trouble? Contact support@furtopia.com
          </p>
        </div>
      </div>
    </div>
  );
}