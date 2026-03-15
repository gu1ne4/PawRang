import React, { useState } from 'react';
import { IoAtOutline, IoLockClosedOutline } from 'react-icons/io5';

export default function ChangeCreds() {
  // Added state to hold the input values so it's ready for your backend logic
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your API call here to update the credentials
    console.log("Submitting new creds:", { username, password });
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // Replaces the expo-linear-gradient component
        background: 'linear-gradient(to bottom, #ffffff 0%, #3d67ee 100%)',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}
    >
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.9)', // Glass effect background
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
        <div style={{ fontSize: '13px', color: 'rgba(0, 0, 0, 0.52)', marginBottom: '30px', lineHeight: '1.4' }}>
          This will be your new username and password for future access. Make sure they meet the security requirements and are easy for you to remember.
        </div>

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
              placeholder="Password" 
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
              boxShadow: '0 4px 15px rgba(61, 103, 238, 0.3)',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Update Credentials
          </button>
        </form>

      </div>
    </div>
  );
}