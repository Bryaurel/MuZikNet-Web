// src/pages/__tests__/Login.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../Login';

// 1. Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
  Link: ({ children }) => <a>{children}</a>
}));

// 2. Mock Firebase
vi.mock('../../firebase', () => ({ auth: {}, db: {}, provider: {} }));
vi.mock('firebase/auth', () => ({ signInWithEmailAndPassword: vi.fn(), signInWithPopup: vi.fn() }));

describe('Login Page', () => {
  it('renders the login form correctly', () => {
    render(<Login />);
    
    // Verify inputs exist
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('updates form state when user types', () => {
    render(<Login />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');

    // Simulate user typing
    fireEvent.change(emailInput, { target: { value: 'test@muziknet.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword123' } });

    // Verify the inputs captured the text
    expect(emailInput.value).toBe('test@muziknet.com');
    expect(passwordInput.value).toBe('securepassword123');
  });
});