import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoKeyOutline, IoPersonOutline, IoLockClosedOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { supabase } from '../supabaseClient'; // Ensure this points to your client setup

export default function UpdateAccPage() {
  const navigate = useNavigate();

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirmPassword?: string; server?: string }>({});

  // Automatically fetch their temporary username when the page loads
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('employee_accounts')
          .select('username')
          .eq('id', user.id)
          .single();
          
        if (data && data.username) {
          setNewUsername(data.username);
        }
      }
    };
    fetchUserData();
  }, []);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string; confirmPassword?: string } = {};
    
    // Username validation
    if (!newUsername.trim()) {
      newErrors.username = 'Username is required';
    } else if (newUsername.length < 3 || newUsername.length > 20) {
      newErrors.username = 'Username must be 3-20 characters';
    } else if (!/^[a-zA-Z0-9._]+$/.test(newUsername)) {
      newErrors.username = 'Only letters, numbers, dots, and underscores allowed';
    }

    // Password validation
    if (!newPassword) {
      newErrors.password = 'Password is required';
    } else if (newPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (newPassword.length > 30) {
      newErrors.password = 'Password must be less than 30 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({}); // Clear previous errors

    try {
      // 1. Get the user that was authenticated by the email link
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Session expired or invalid. Please click the link in your email again.");
      }

      // 2. Update the Password in Supabase's secure Auth vault
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (authError) throw authError;

      // 3. Update the Username in your employee_accounts table AND remove the 'initial_login' flag
      const { error: dbError } = await supabase
        .from('employee_accounts')
        .update({ 
          username: newUsername.trim(),
          is_initial_login: false 
        })
        .eq('id', user.id);
      if (dbError) throw dbError;

      // 4. Success! Clear session and force them to login with new creds
      await supabase.auth.signOut();
      localStorage.removeItem('userSession');
      
      window.alert('Credentials updated successfully! Please login with your new credentials.');
      navigate('/login', { replace: true });

    } catch (error: any) {
      console.error('Update error:', error);
      setErrors({ server: error.message || 'An error occurred while updating credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(to bottom, #667eea, #764ba2, #667eea)',
      position: 'relative'
    }}>
      
      {/* Background Pattern Overlay */}
      <div style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.1,
        backgroundColor: '#000',
        zIndex: 0
      }}></div>

      {/* Main Container */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '20px',
        zIndex: 1
      }}>
        
        {/* Glass Effect Card */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '480px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          boxSizing: 'border-box'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '30px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <IoKeyOutline size={30} color="#fff" />
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#fff',
              marginBottom: '8px',
              marginTop: 0,
              textAlign: 'center'
            }}>
              Update Credentials
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              lineHeight: '24px',
              margin: 0
            }}>
              This is your first login. Please set your permanent username and password.
            </p>
          </div>

          {/* Server Error Alert */}
          {errors.server && (
            <div style={{ 
              backgroundColor: 'rgba(255, 107, 107, 0.2)', 
              border: '1px solid #ff6b6b', 
              color: '#ffd0d0', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {errors.server}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleUpdateCredentials} style={{ marginBottom: '32px' }}>
            
            {/* Username Input */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <IoPersonOutline size={20} color="rgba(255, 255, 255, 0.7)" />
                <label style={{ 
                  marginLeft: '8px', 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: '600' 
                }}>
                  New Username
                </label>
              </div>
              <input
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '16px',
                  border: `1px solid ${errors.username ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)'}`,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                placeholder="Choose a username (3-20 chars)"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (errors.username) setErrors({...errors, username: undefined});
                }}
              />
              {errors.username && (
                <div style={{ color: '#ffd0d0', fontSize: '13px', marginTop: '6px' }}>
                  {errors.username}
                </div>
              )}
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <IoLockClosedOutline size={20} color="rgba(255, 255, 255, 0.7)" />
                <label style={{ 
                  marginLeft: '8px', 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: '600' 
                }}>
                  New Password
                </label>
              </div>
              <input
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '16px',
                  border: `1px solid ${errors.password ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)'}`,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                type="password"
                placeholder="Choose a password (min 6 chars)"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.password) setErrors({...errors, password: undefined});
                }}
              />
              {errors.password && (
                <div style={{ color: '#ffd0d0', fontSize: '13px', marginTop: '6px' }}>
                  {errors.password}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <IoLockClosedOutline size={20} color="rgba(255, 255, 255, 0.7)" />
                <label style={{ 
                  marginLeft: '8px', 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: '600' 
                }}>
                  Confirm Password
                </label>
              </div>
              <input
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '16px',
                  border: `1px solid ${errors.confirmPassword ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)'}`,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({...errors, confirmPassword: undefined});
                }}
              />
              {errors.confirmPassword && (
                <div style={{ color: '#ffd0d0', fontSize: '13px', marginTop: '6px' }}>
                  {errors.confirmPassword}
                </div>
              )}
            </div>

            {/* Update Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '18px',
                width: '100%',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', borderColor: 'rgba(102,126,234,0.3)', borderTopColor: '#667eea' }}></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <IoCheckmarkCircleOutline size={24} color="#667eea" />
                  <span style={{ 
                    color: '#667eea', 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    marginLeft: '8px'
                  }}>
                    Update Credentials
                  </span>
                </div>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '16px',
            borderLeft: '4px solid #4ade80'
          }}>
            <h3 style={{ 
              color: '#fff', 
              fontSize: '14px', 
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              🔒 Security Tips
            </h3>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '12px',
              lineHeight: '18px',
              margin: 0
            }}>
              • Choose a strong, unique password<br/>
              • Don't reuse passwords from other sites<br/>
              • You'll be logged out after updating
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}