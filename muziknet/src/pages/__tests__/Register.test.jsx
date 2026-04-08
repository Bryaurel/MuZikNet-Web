// src/pages/__tests__/Register.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Register from '../Register';

// 1. Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }) => <a>{children}</a>
}));

// 2. Mock Firebase Auth & Firestore
vi.mock('../../firebase', () => ({ auth: {}, db: {}, provider: {} }));
vi.mock('firebase/auth', () => ({ 
  createUserWithEmailAndPassword: vi.fn(), 
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn()
}));
vi.mock('firebase/firestore', () => ({ 
  doc: vi.fn(), 
  setDoc: vi.fn(), 
  getDoc: vi.fn() 
}));

describe('Register Page', () => {
  it('renders the registration form correctly', () => {
    render(<Register />);
    
    // Verify all distinct inputs and buttons exist
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Create a Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('updates form state when a new user types their information', () => {
    render(<Register />);
    
    const nameInput = screen.getByPlaceholderText('Full Name');
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Create a Password');

    // Simulate the user typing
    fireEvent.change(nameInput, { target: { value: 'Burna Boy' } });
    fireEvent.change(emailInput, { target: { value: 'burna@muziknet.com' } });
    fireEvent.change(passwordInput, { target: { value: 'odogwu123' } });

    // Verify the component successfully held the state
    expect(nameInput.value).toBe('Burna Boy');
    expect(emailInput.value).toBe('burna@muziknet.com');
    expect(passwordInput.value).toBe('odogwu123');
  });
});