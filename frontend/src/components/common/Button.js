import React from 'react';

const stylesByVariant = {
  primary: {
    backgroundColor: '#4A90E2',
    color: '#FFFFFF',
    border: '2px solid #4A90E2',
    hoverBg: '#357ABD',
    hoverBorder: '#357ABD',
    hoverColor: '#FFFFFF'
  },
  secondary: {
    backgroundColor: 'transparent',
    color: '#4A90E2',
    border: '2px solid #4A90E2',
    hoverBg: 'rgba(74, 144, 226, 0.08)',
    hoverBorder: '#4A90E2',
    hoverColor: '#4A90E2'
  },
  neutral: {
    backgroundColor: '#F4F6F8',
    color: '#2C3E50',
    border: '2px solid #F4F6F8',
    hoverBg: '#E6EAEE',
    hoverBorder: '#E6EAEE',
    hoverColor: '#2C3E50'
  },
  accent: {
    backgroundColor: '#F5A623',
    color: '#FFFFFF',
    border: '2px solid #F5A623',
    hoverBg: '#D48806',
    hoverBorder: '#D48806',
    hoverColor: '#FFFFFF'
  },
  danger: {
    backgroundColor: '#FF5A5F',
    color: '#FFFFFF',
    border: '2px solid #FF5A5F',
    hoverBg: '#E0484D',
    hoverBorder: '#E0484D',
    hoverColor: '#FFFFFF'
  }
};

const Button = ({ variant = 'primary', icon, children, onClick, disabled, type = 'button', style, title, ariaLabel }) => {
  const v = stylesByVariant[variant] || stylesByVariant.primary;
  const baseStyle = {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    fontSize: 14,
    fontWeight: 500,
    padding: '10px 20px',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    backgroundColor: disabled ? '#E6EAEE' : v.backgroundColor,
    color: disabled ? '#8FA0B3' : v.color,
    border: v.border,
    outline: 'none',
    ...style
  };

  const [hover, setHover] = React.useState(false);
  const computedStyle = hover && !disabled ? {
    ...baseStyle,
    backgroundColor: v.hoverBg,
    color: v.hoverColor,
    border: `2px solid ${v.hoverBorder}`
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
      {icon ? <span style={{ display: 'inline-flex' }}>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;


