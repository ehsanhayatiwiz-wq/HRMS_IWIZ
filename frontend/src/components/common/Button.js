import React from 'react';

const stylesByVariant = {
  primary: {
    background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 50%, var(--accent-500) 100%)',
    color: 'var(--text-inverse)',
    border: '2px solid transparent',
    hoverBg: 'linear-gradient(135deg, var(--primary-600) 0%, var(--secondary-600) 50%, var(--accent-600) 100%)',
    hoverBorder: '2px solid transparent',
    hoverColor: 'var(--text-inverse)',
    shadow: 'var(--shadow-glow)',
    hoverShadow: 'var(--shadow-xl)'
  },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--primary-600)',
    border: '2px solid var(--primary-500)',
    hoverBg: 'var(--primary-50)',
    hoverBorder: 'var(--primary-600)',
    hoverColor: 'var(--primary-700)',
    shadow: 'none',
    hoverShadow: 'var(--shadow-sm)'
  },
  neutral: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '2px solid var(--border-light)',
    hoverBg: 'var(--bg-secondary)',
    hoverBorder: 'var(--border-medium)',
    hoverColor: 'var(--text-primary)',
    shadow: 'var(--shadow-sm)',
    hoverShadow: 'var(--shadow-md)'
  },
  accent: {
    backgroundColor: 'var(--accent-500)',
    color: 'var(--text-inverse)',
    border: '2px solid var(--accent-500)',
    hoverBg: 'var(--accent-600)',
    hoverBorder: 'var(--accent-600)',
    hoverColor: 'var(--text-inverse)',
    shadow: 'var(--shadow-glow)',
    hoverShadow: 'var(--shadow-xl)'
  },
  danger: {
    backgroundColor: 'var(--error-500)',
    color: 'var(--text-inverse)',
    border: '2px solid var(--error-500)',
    hoverBg: 'var(--error-600)',
    hoverBorder: 'var(--error-600)',
    hoverColor: 'var(--text-inverse)',
    shadow: 'var(--shadow-glow)',
    hoverShadow: 'var(--shadow-xl)'
  },
  success: {
    backgroundColor: 'var(--success-500)',
    color: 'var(--text-inverse)',
    border: '2px solid var(--success-500)',
    hoverBg: 'var(--success-600)',
    hoverBorder: 'var(--success-600)',
    hoverColor: 'var(--text-inverse)',
    shadow: 'var(--shadow-glow)',
    hoverShadow: 'var(--shadow-xl)'
  }
};

const Button = ({ variant = 'primary', icon, children, onClick, disabled, type = 'button', style, title, ariaLabel, size = 'medium', fullWidth = false }) => {
  const v = stylesByVariant[variant] || stylesByVariant.primary;
  
  const sizeStyles = {
    small: {
      padding: 'var(--space-2) var(--space-3)',
      fontSize: 'var(--text-sm)',
      borderRadius: 'var(--radius-lg)'
    },
    medium: {
      padding: 'var(--space-3) var(--space-6)',
      fontSize: 'var(--text-base)',
      borderRadius: 'var(--radius-xl)'
    },
    large: {
      padding: 'var(--space-4) var(--space-8)',
      fontSize: 'var(--text-lg)',
      borderRadius: 'var(--radius-xl)'
    }
  };

  const baseStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: sizeStyles[size].fontSize,
    fontWeight: 'var(--font-semibold)',
    padding: sizeStyles[size].padding,
    borderRadius: sizeStyles[size].borderRadius,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    transition: 'all var(--transition-normal)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    background: disabled ? 'var(--neutral-300)' : (v.background || v.backgroundColor),
    color: disabled ? 'var(--neutral-500)' : v.color,
    border: v.border,
    outline: 'none',
    boxShadow: v.shadow,
    width: fullWidth ? '100%' : 'auto',
    minHeight: size === 'small' ? '36px' : size === 'medium' ? '44px' : '52px',
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  const [hover, setHover] = React.useState(false);
  
  const computedStyle = hover && !disabled ? {
    ...baseStyle,
    background: v.hoverBg || v.hoverBackgroundColor,
    color: v.hoverColor,
    border: v.hoverBorder,
    transform: 'translateY(-2px)',
    boxShadow: v.hoverShadow
  } : baseStyle;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={computedStyle}
      title={title}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      {/* Shimmer effect - Fixed animation */}
      {hover && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            transition: 'left 0.5s ease-out',
            animation: 'shimmer 0.5s ease-out forwards'
          }}
        />
      )}
      
      {icon && (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center',
          fontSize: size === 'small' ? 'var(--text-sm)' : size === 'medium' ? 'var(--text-base)' : 'var(--text-lg)'
        }}>
          {icon}
        </span>
      )}
      
      <span style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}>
        {children}
      </span>
    </button>
  );
};

export default Button;


