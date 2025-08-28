import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-secondary)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)',
        padding: '2rem',
        maxWidth: 560,
        width: '100%',
        textAlign: 'center'
      }}>
        <img src={process.env.PUBLIC_URL + '/logo.png'} alt="IWIZ" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ height: 48, marginBottom: 16 }} />
        <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 28, fontWeight: 700 }}>Page not found</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px 0' }}>
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link to="/dashboard" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--primary-color)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 10,
          textDecoration: 'none',
          fontWeight: 600
        }}>
          Go back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;


