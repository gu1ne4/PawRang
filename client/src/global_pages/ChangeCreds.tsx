import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoAtOutline, IoLockClosedOutline } from 'react-icons/io5';
import { supabase } from '../supabaseClient'; // Ensure this path is correct!

export default function ChangeCreds() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Added states for loading and displaying success/error alerts
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch their current username when the page loads so they can see what it is before changing it
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
          setUsername(data.username);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Basic Validation
    if (!password || password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }
    if (!username.trim()) {
      setMessage({ text: 'Username cannot be empty.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 2. Get the user that was authenticated by the email link
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Session expired or invalid. Please click the link in your email again.");
      }

      // 3. Update the Password in Supabase's secure Auth vault
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });
      if (authError) throw authError;

      // 4. Update the Username in your employee_accounts table AND remove the 'initial_login' flag
      const { error: dbError } = await supabase
        .from('employee_accounts')
        .update({ 
          username: username.trim(),
          is_initial_login: false 
        })
        .eq('id', user.id);
      if (dbError) throw dbError;

      // 5. Success! Log them out of the temporary session and send to Login
      setMessage({ text: 'Credentials updated successfully! Redirecting to login...', type: 'success' });
      
      setTimeout(async () => {
        // Sign them out securely so they have to use their new password
        await supabase.auth.signOut();
        navigate('/login'); 
      }, 2000);

    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred while updating credentials.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, #ffffff 0%, #3d67ee 100%)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
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
          width: '90%'
        }}
      >
        <h2 style={{ fontWeight: '600', fontSize: '30px', margin: '0 0 8px 0', color: '#333' }}>
          Set Your New Credentials
        </h2>
        <p style={{ fontSize: '16px', margin: '0 0 20px 0', color: '#555' }}>
          Create a new Username and Password to replace your temporary ones.
        </p>
        <div style={{ fontSize: '13px', color: 'rgba(0, 0, 0, 0.52)', marginBottom: '20px', lineHeight: '1.4' }}>
          This will be your new username and password for future access. Make sure they meet the security requirements and are easy for you to remember.
        </div>

        {/* Success/Error Message Box */}
        {message && (
          <div style={{ 
            color: message.type === 'success' ? '#2e7d32' : '#d32f2f', 
            backgroundColor: message.type === 'success' ? '#e8f5e8' : '#ffebee', 
            border: `1px solid ${message.type === 'success' ? '#c3e6c3' : '#ffcdd2'}`,
            padding: '12px 15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          
          {/* Username Input Group */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: '100%',
            backgroundColor: 'rgba(95, 95, 95, 0.17)',
            border: '1px solid #5f5f5f',
            borderRadius: '8px',
            padding: '10px 15px',
            marginBottom: '15px',
            boxSizing: 'border-box'
          }}>
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
                color: '#333'
              }}
            />
          </div>

          {/* Password Input Group */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: '100%',
            backgroundColor: 'rgba(95, 95, 95, 0.17)',
            border: '1px solid #5f5f5f',
            borderRadius: '8px',
            padding: '10px 15px',
            marginBottom: '25px',
            boxSizing: 'border-box'
          }}>
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
                color: '#333'
              }}
            />
          </div>

          {/* Submit Button */}
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
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.opacity = '0.9' }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.opacity = '1' }}
          >
            {loading ? 'Updating...' : 'Update Credentials'}
          </button>
        </form>

      </div>
    </div>
  );
}