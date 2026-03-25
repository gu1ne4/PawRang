import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack, IoKeyOutline, IoAlertCircle, IoBugOutline, IoInformationCircle } from 'react-icons/io5';

export default function ChangePassOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // React Router state replacement for route.params
  const { email, otp: devOtp } = location.state || { email: '', otp: '' };
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  
  // Array of refs for the HTML input elements
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers and limit to 1 char
    const sanitizedValue = value.replace(/[^0-9]/g, '').slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = sanitizedValue;
    setOtp(newOtp);
    setError('');
    
    // Auto-focus next input if a value was entered
    if (sanitizedValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Auto-focus previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const API_URL = 'http://localhost:5000'; // Updated to port 5000
      
      console.log('🔄 STEP 1: Verifying OTP');
      console.log('📧 Email:', email);
      console.log('🔑 Entered OTP:', otpString);
      
      // First, debug what's in database
      console.log('🔍 Checking OTP status in database...');
      const debugResponse = await fetch(`${API_URL}/debug-otp-status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email }),
      });
      
      const debugData = await debugResponse.json();
      console.log('🔍 Debug OTP status:', debugData);
      
      // Now verify OTP
      console.log('🔄 STEP 2: Calling verify-otp endpoint');
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          otp: otpString
        }),
      });

      console.log('🔄 STEP 3: Got verify response');
      console.log('📊 Status:', response.status);
      const data = await response.json();
      console.log('📦 Verify response data:', data);

      if (response.ok) {
        console.log('✅ OTP verified successfully!');
        console.log('🔄 Navigating to ChangePass page...');
        
        // Navigate to reset password page via React Router
        navigate('/ChangePass', { 
          state: {
            email, 
            otp: otpString,
            fromOTP: true
          }
        });
      } else {
        console.log('❌ OTP verification failed:', data.error);
        setError(data.error || 'Invalid OTP');
        
        // Show detailed error in alert
        window.alert(`OTP Verification Failed\n\n${data.error}\n\nCheck console logs for details.`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setError('Network error. Please check your connection.');
      window.alert('Error: Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend && timer > 0) {
      window.alert(`Please wait: You can resend OTP in ${formatTime(timer)}`);
      return;
    }

    setLoading(true);
    try {
      const API_URL = 'http://localhost:5000'; // Updated to port 5000
      
      console.log('Resending OTP for email:', email);
      
      const response = await fetch(`${API_URL}/request-password-reset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log('Resend response:', data);

      if (response.ok) {
        window.alert('Success: New OTP sent to your email');
        setTimer(300); // Reset timer to 5 minutes
        setCanResend(false);
        setOtp(['', '', '', '', '', '']); // Clear OTP inputs
        setError('');
        inputRefs.current[0]?.focus();
      } else {
        window.alert('Error: ' + (data.error || 'Failed to resend OTP'));
      }
    } catch (error) {
      console.error('Resend error:', error);
      window.alert('Error: Network error');
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
              Verify OTP
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: '#666',
              textAlign: 'center',
              lineHeight: '24px',
              maxWidth: '300px',
              margin: 0
            }}>
              Enter the 6-digit OTP sent to your email address
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

          {/* OTP Inputs */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#555',
              marginBottom: '12px',
              paddingLeft: '4px',
              textAlign: 'center'
            }}>
              6-digit OTP Code
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'row', 
              justifyContent: 'center', 
              gap: '10px',
              marginBottom: '15px'
            }}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  style={{
                    width: '50px',
                    height: '50px',
                    border: `2px solid ${error ? '#ff4444' : (otp[index] ? '#3d67ee' : '#ddd')}`,
                    borderRadius: '10px',
                    textAlign: 'center',
                    fontSize: '20px',
                    fontWeight: '700',
                    backgroundColor: '#fff',
                    color: '#1a237e',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  value={otp[index]}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={(e) => e.target.select()}
                  disabled={loading}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              ))}
            </div>
            
            {error && (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: '8px' }}>
                <IoAlertCircle size={16} color="#ff4444" style={{ marginRight: '6px' }} />
                <span style={{ color: '#ff4444', fontSize: '14px' }}>{error}</span>
              </div>
            )}
          </div>

          {/* Timer Display */}
          <div style={{ 
            backgroundColor: timer < 60 ? '#fff3e0' : '#f5f5f5',
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '20px',
            border: `1px solid ${timer < 60 ? '#ffb74d' : '#e0e0e0'}`
          }}>
            <div style={{ 
              textAlign: 'center', 
              color: timer < 60 ? '#e65100' : '#666',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {timer > 0 ? (
                `⏰ OTP expires in: ${formatTime(timer)}`
              ) : (
                '⌛ OTP has expired'
              )}
            </div>
          </div>

          {/* Development OTP Display (Only shows in Vite Dev mode) */}
          {devOtp && import.meta.env.DEV && (
            <div style={{
              backgroundColor: '#fff8e1',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #ffd54f',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <IoBugOutline size={20} color="#ff9800" style={{ marginRight: '10px', marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#ff9800',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    Development OTP
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    color: '#333',
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: '4px'
                  }}>
                    {devOtp}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    lineHeight: '18px',
                    textAlign: 'center'
                  }}>
                    Use this OTP for testing
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verify Button */}
          <button
            style={{
              backgroundColor: otp.join('').length === 6 ? '#3d67ee' : '#cccccc',
              borderRadius: '12px',
              padding: '18px 0',
              border: 'none',
              width: '100%',
              marginBottom: '16px',
              opacity: loading ? 0.7 : 1,
              cursor: (loading || otp.join('').length !== 6) ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onClick={handleVerifyOTP}
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div>
            ) : (
              <span style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Verify OTP
              </span>
            )}
          </button>

          {/* Resend OTP Button */}
          <button
            style={{
              backgroundColor: (canResend || timer <= 0) ? '#f0f7ff' : '#f5f5f5',
              borderRadius: '12px',
              padding: '18px 0',
              border: `1px solid ${(canResend || timer <= 0) ? '#3d67ee' : '#ddd'}`,
              width: '100%',
              marginBottom: '24px',
              opacity: loading ? 0.7 : 1,
              cursor: (loading || (!canResend && timer > 0)) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleResendOTP}
            disabled={loading || (!canResend && timer > 0)}
          >
            <span style={{
              color: (canResend || timer <= 0) ? '#3d67ee' : '#999',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {loading ? 'Sending...' : 'Resend OTP'}
            </span>
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
                  OTP Instructions
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#555',
                  lineHeight: '20px'
                }}>
                  • Check your email inbox (and spam folder) for the OTP<br />
                  • Enter the 6-digit code exactly as shown<br />
                  • OTP will expire in 5 minutes<br />
                  • Can't find the email? Click "Resend OTP" above
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