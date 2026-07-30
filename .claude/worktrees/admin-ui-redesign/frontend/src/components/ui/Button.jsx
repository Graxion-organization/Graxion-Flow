import React from 'react';
import { styles } from './Button.styles';

const Button = ({
  children,
  type = 'primary',
  size = 'medium',
  disabled = false,
  onClick = () => {}
}) => {
  return (
    <button
      type="button"
      className="{styles.button[type][size]} {styles.button[disabled ? 'disabled' : 'enabled']}}"
      onClick={onClick}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;