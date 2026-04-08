// src/components/__tests__/FeedPost.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedPost from '../FeedPost';

// Mock Firebase
vi.mock('../../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ 
    collection: vi.fn(), 
    query: vi.fn(), 
    where: vi.fn(), 
    // We tell it to return a dummy function so 'unsub()' doesn't crash!
    onSnapshot: vi.fn(() => vi.fn()) 
}));

describe('FeedPost Component', () => {
  const longCaption = "This is a very long caption that exceeds the two hundred and eighty character limit so that we can test if the read more button actually appears on the screen when we render this component. ".repeat(3);
  
  const mockPost = {
    id: "post1",
    userStageName: "Burna Boy",
    caption: longCaption,
    createdAt: { toDate: () => new Date() },
    likes: [],
    comments: []
  };

  it('truncates long text and expands when "See more" is clicked', () => {
    render(<FeedPost post={mockPost} currentUser={{uid: "123"}} navigate={vi.fn()} saveScroll={vi.fn()} onToggleMute={vi.fn()} isMuted={true} />);
    
    // The "See more" button should be visible
    const expandButton = screen.getByText('…See more');
    expect(expandButton).toBeInTheDocument();

    // Click the button
    fireEvent.click(expandButton);

    // The text should change to "See less"
    expect(screen.getByText('See less')).toBeInTheDocument();
  });
});