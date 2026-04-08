// src/components/__tests__/MyBookingCard.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyBookingCard from '../MyBookingCard';

// 1. Mock Firebase so it doesn't crash
vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(), updateDoc: vi.fn(), addDoc: vi.fn(), collection: vi.fn(), serverTimestamp: vi.fn()
}));

describe('MyBookingCard Component', () => {
  const mockBooking = {
    id: "booking_123",
    title: "Wedding Gig",
    status: "confirmed",
    requesterUserId: "host999",
    performerUserId: "talent777",
    // Mock the Firestore timestamp behavior
    start: { toDate: () => new Date('2026-12-25') },
    pay: "$500",
    location: "Kigali"
  };

  it('renders correctly for a Host (isSentByMe = true)', () => {
    render(<MyBookingCard booking={mockBooking} isSentByMe={true} onOpenReview={() => {}} />);
    
    // As a host, the card should tell them WHICH talent they sent it to
    expect(screen.getByText('To: Talent ID talen')).toBeInTheDocument();
    expect(screen.getByText('Wedding Gig')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('renders correctly for a Talent (isSentByMe = false)', () => {
    render(<MyBookingCard booking={mockBooking} isSentByMe={false} onOpenReview={() => {}} />);
    
    // As a talent, the card should tell them WHO sent it to them
    expect(screen.getByText('From: Host ID host9')).toBeInTheDocument();
  });
});