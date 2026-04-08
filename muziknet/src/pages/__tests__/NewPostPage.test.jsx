// src/pages/__tests__/NewPostPage.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewPostPage from '../NewPostPage';

// 1. Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// 2. Mock Firebase & current user
vi.mock('../../firebase', () => ({ 
  auth: { currentUser: { uid: "test-user-123" } }, 
  db: {}, 
  storage: {} 
}));
vi.mock('firebase/firestore', () => ({ 
  doc: vi.fn(), 
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ username: "TestArtist" }) })), 
  collection: vi.fn(), 
  addDoc: vi.fn(), 
  serverTimestamp: vi.fn() 
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

describe('NewPostPage Component', () => {
  it('renders the post creation UI', () => {
    render(<NewPostPage />);
    
    expect(screen.getByText('Create New Post')).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What's on your mind? Tell your fans...")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Share Post/i })).toBeInTheDocument();
  });

  it('allows the user to type a caption', () => {
    render(<NewPostPage />);
    
    const captionInput = screen.getByPlaceholderText("What's on your mind? Tell your fans...");
    
    fireEvent.change(captionInput, { target: { value: 'Just finished an amazing set in Kigali!' } });
    
    expect(captionInput.value).toBe('Just finished an amazing set in Kigali!');
  });
});