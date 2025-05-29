import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TicketDetail from '../TicketDetail';
import * as api from '../../services/api';

jest.mock('../../services/api');

const mockTicketData = {
  id: 1, // Database PK
  jira_id: 'JIRA-123',
  title: 'Test Ticket Detail',
  description: 'Detailed description of the test ticket.',
  status: 'Open',
  priority: 'High',
  assignee: 'Test User',
  reporter: 'Another User',
  created_date: '2024-01-15T10:00:00Z',
  updated_date: '2024-01-16T14:30:00Z',
  due_date: '2024-02-01T00:00:00Z',
  project: 1, // Assuming project ID
  comments: [
    { id: 1, author: 'Commenter1', body: 'First comment here.', created_date: '2024-01-15T11:00:00Z' },
    { id: 2, author: 'Commenter2', body: 'Second thoughts.', created_date: '2024-01-16T09:00:00Z' },
  ],
};

// Mock process.env
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules(); // Clears the cache
  process.env = {
    ...originalEnv,
    REACT_APP_JIRA_BASE_URL: 'https://myjira.example.com',
  };
  api.getTicketById.mockClear();
  api.updateTicketStatus.mockClear();
  api.addTicketComment.mockClear();
});

afterEach(() => {
  process.env = originalEnv; // Restore original env
});

// Helper to render with router context, as TicketDetail uses useParams
const renderWithRouter = (ui, { route = '/', path = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('TicketDetail Component', () => {
  test('renders loading state initially', () => {
    api.getTicketById.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });
    expect(screen.getByText(/loading ticket details for id: JIRA-123.../i)).toBeInTheDocument();
  });

  test('fetches ticket details on mount and displays them', async () => {
    api.getTicketById.mockResolvedValue({ data: mockTicketData });
    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });

    expect(api.getTicketById).toHaveBeenCalledWith('JIRA-123');
    
    await waitFor(() => {
      expect(screen.getByText(mockTicketData.title)).toBeInTheDocument();
      expect(screen.getByText(mockTicketData.description)).toBeInTheDocument();
      expect(screen.getByText(`Jira Key: ${mockTicketData.jira_id}`)).toBeInTheDocument();
      expect(screen.getByText(`Status: ${mockTicketData.status}`)).toBeInTheDocument();
      expect(screen.getByText(`Assignee: ${mockTicketData.assignee}`)).toBeInTheDocument();
      expect(screen.getByText(mockTicketData.comments[0].body)).toBeInTheDocument();
      expect(screen.getByText(mockTicketData.comments[1].body)).toBeInTheDocument();
    });
  });

  test('displays "View in JIRA" link correctly', async () => {
    api.getTicketById.mockResolvedValue({ data: mockTicketData });
    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });

    await waitFor(() => {
      const jiraLink = screen.getByRole('link', { name: /view in jira/i });
      expect(jiraLink).toBeInTheDocument();
      expect(jiraLink).toHaveAttribute('href', `${process.env.REACT_APP_JIRA_BASE_URL}/browse/${mockTicketData.jira_id}`);
    });
  });
  
  test('displays error message if fetching ticket details fails', async () => {
    api.getTicketById.mockRejectedValue(new Error('API Error'));
    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-456', path: '/tickets/:id' });

    await waitFor(() => {
      expect(screen.getByText(/failed to load ticket JIRA-456. it might not exist or there was a network issue./i)).toBeInTheDocument();
    });
  });

  test('uses placeholder data if api.getTicketById returns no data', async () => {
    api.getTicketById.mockResolvedValue({ data: null });
    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-789', path: '/tickets/:id' });
    
    await waitFor(() => {
      expect(screen.getByText('Placeholder for Ticket JIRA-789')).toBeInTheDocument();
      expect(screen.getByText('This is a placeholder comment.')).toBeInTheDocument();
    });
  });

  test('allows updating ticket status', async () => {
    const user = userEvent.setup();
    api.getTicketById.mockResolvedValue({ data: mockTicketData });
    const updatedTicketData = { ...mockTicketData, status: 'In Progress' };
    api.updateTicketStatus.mockResolvedValue({ data: updatedTicketData }); // Mock successful status update

    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });

    await waitFor(() => { // Wait for initial load
      expect(screen.getByText(`Status: ${mockTicketData.status}`)).toBeInTheDocument();
    });
    
    // Find the button for "In Progress" status. The button text is "Mark as In Progress"
    const statusButton = screen.getByRole('button', { name: /mark as In Progress/i });
    await user.click(statusButton);

    expect(api.updateTicketStatus).toHaveBeenCalledTimes(1);
    // TicketDetail passes the database PK (mockTicketData.id) to updateTicketStatus
    expect(api.updateTicketStatus).toHaveBeenCalledWith(mockTicketData.id, { status: 'In Progress' });

    await waitFor(() => {
      expect(screen.getByText(`Status: ${updatedTicketData.status}`)).toBeInTheDocument();
    });
  });
  
  test('handles error when updating ticket status', async () => {
    const user = userEvent.setup();
    api.getTicketById.mockResolvedValue({ data: mockTicketData });
    api.updateTicketStatus.mockRejectedValue(new Error('Update failed'));

    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });
    
    await waitFor(() => {
      expect(screen.getByText(`Status: ${mockTicketData.status}`)).toBeInTheDocument();
    });

    const statusButton = screen.getByRole('button', { name: /mark as Resolved/i });
    await user.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update status. please try again./i)).toBeInTheDocument();
    });
     // Status should not have changed
    expect(screen.getByText(`Status: ${mockTicketData.status}`)).toBeInTheDocument();
  });

  test('allows adding a comment', async () => {
    const user = userEvent.setup();
    const newCommentText = 'This is a new test comment.';
    const newCommentResponse = { 
        id: 3, 
        author: 'CurrentUser', // Assuming backend might return this or it's from user session
        body: newCommentText, 
        created_date: new Date().toISOString(),
        ticket: mockTicketData.id 
    };
    // Mock getTicketById to be called again after comment submission for refresh
    api.getTicketById.mockResolvedValueOnce({ data: mockTicketData }); // Initial load
    api.addTicketComment.mockResolvedValue({ data: newCommentResponse });
    // Simulate the ticket data being refreshed with the new comment
    const updatedTicketWithNewComment = {
        ...mockTicketData,
        comments: [...mockTicketData.comments, newCommentResponse]
    };
    api.getTicketById.mockResolvedValueOnce({ data: updatedTicketWithNewComment }); // After comment post

    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });

    await waitFor(() => { // Initial load
      expect(screen.getByText(mockTicketData.comments[0].body)).toBeInTheDocument();
    });

    const commentTextarea = screen.getByPlaceholderText(/write your comment here.../i);
    const submitButton = screen.getByRole('button', { name: /add comment/i });

    await user.type(commentTextarea, newCommentText);
    expect(commentTextarea.value).toBe(newCommentText);
    
    await user.click(submitButton);

    expect(api.addTicketComment).toHaveBeenCalledTimes(1);
    expect(api.addTicketComment).toHaveBeenCalledWith(mockTicketData.id, { body: newCommentText });

    // Wait for the component to re-fetch and display the new comment
    await waitFor(() => {
      expect(screen.getByText(newCommentText)).toBeInTheDocument();
    });
    // Textarea should be cleared
    expect(commentTextarea.value).toBe('');
  });

  test('handles error when adding a comment', async () => {
    const user = userEvent.setup();
    api.getTicketById.mockResolvedValue({ data: mockTicketData });
    api.addTicketComment.mockRejectedValue(new Error('Comment post failed'));

    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });

    await waitFor(() => {
      expect(screen.getByText(mockTicketData.comments[0].body)).toBeInTheDocument();
    });

    const commentTextarea = screen.getByPlaceholderText(/write your comment here.../i);
    const submitButton = screen.getByRole('button', { name: /add comment/i });

    await user.type(commentTextarea, 'A comment that will fail');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to add comment. please try again./i)).toBeInTheDocument();
    });
    // Comment text should remain in textarea
    expect(commentTextarea.value).toBe('A comment that will fail');
  });
  
  test('status buttons are disabled correctly', async () => {
    api.getTicketById.mockResolvedValue({ data: { ...mockTicketData, status: 'Open' } });
    renderWithRouter(<TicketDetail />, { route: '/tickets/JIRA-123', path: '/tickets/:id' });

    await waitFor(() => {
      // The button for the current status ("Open") should be disabled and marked active
      const openStatusButton = screen.getByRole('button', { name: /mark as Open/i });
      expect(openStatusButton).toBeDisabled();
      expect(openStatusButton).toHaveClass('active-status');

      // Other status buttons should be enabled
      const inProgressButton = screen.getByRole('button', { name: /mark as In Progress/i });
      expect(inProgressButton).not.toBeDisabled();
    });
  });
});
