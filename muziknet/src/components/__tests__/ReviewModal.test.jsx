// src/components/__tests__/ReviewModal.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewModal from '../ReviewModal';

// 1. MOCK FIREBASE: This prevents the test from actually writing to your live database!
vi.mock('../../firebase', () => ({
  db: {}
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn()
}));

describe('ReviewModal Component', () => {
  const mockBooking = { id: "123", title: "Kigali Jazz Festival", performerUserId: "abc", requesterUserId: "xyz" };
  const mockUser = { uid: "user1" };

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <ReviewModal isOpen={false} booking={mockBooking} isHost={true} currentUser={mockUser} onClose={() => {}} />
    );
    // The robot checks that the modal is completely invisible
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal correctly when isOpen is true', () => {
    render(
      <ReviewModal isOpen={true} booking={mockBooking} isHost={true} currentUser={mockUser} onClose={() => {}} />
    );
    
    // The robot verifies the UI elements loaded
    expect(screen.getByText('Rate the Experience')).toBeInTheDocument();
    expect(screen.getByText("'Kigali Jazz Festival'")).toBeInTheDocument();
    
    // The robot verifies there are exactly 5 musical notes for the rating system
    const notes = screen.getAllByText('🎵');
    expect(notes.length).toBe(5);
  });

  it('allows the user to type a comment', () => {
    render(
      <ReviewModal isOpen={true} booking={mockBooking} isHost={true} currentUser={mockUser} onClose={() => {}} />
    );
    
    // The robot finds the text box and types a review
    const textarea = screen.getByPlaceholderText(/They were amazing to work with!/i);
    fireEvent.change(textarea, { target: { value: 'Incredible performance, the crowd loved them!' } });
    
    // The robot verifies the text box accepted the input
    expect(textarea.value).toBe('Incredible performance, the crowd loved them!');
  });
});