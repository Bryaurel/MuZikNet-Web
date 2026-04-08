// src/components/__tests__/BookingFilters.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingFilters from '../BookingFilters';

describe('BookingFilters Component', () => {
  // Creates a "mock" function to pretend to be the setFilters state updater
  const mockSetFilters = vi.fn();
  
  const defaultFilters = {
    instruments: [],
    locations: [],
    dateFrom: null,
    dateTo: null,
    priceRange: "",
    minRating: 0
  };

  it('renders all the filter categories correctly', () => {
    render(<BookingFilters filters={defaultFilters} setFilters={mockSetFilters} />);
    
    // The robot checks if these words actually appear on the screen
    expect(screen.getByText('Instruments / Skills')).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
  });

  it('adds a new instrument when the user types and presses Enter', () => {
    render(<BookingFilters filters={defaultFilters} setFilters={mockSetFilters} />);
    
    // The robot finds the input box
    const input = screen.getByPlaceholderText('e.g. Guitar, DJ');
    
    // The robot types "Piano" and presses Enter
    fireEvent.change(input, { target: { value: 'Piano' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Verifying that the app tried to update the filters with "Piano"
    expect(mockSetFilters).toHaveBeenCalledWith({
      ...defaultFilters,
      instruments: ['Piano']
    });
  });
});