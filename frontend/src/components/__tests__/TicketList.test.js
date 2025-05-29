import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // For <Link> components
import TicketList from '../TicketList';
import * as api from '../../services/api';

jest.mock('../../services/api');

const mockTicketsData = [
  { id: 1, jira_id: 'JIRA-001', title: 'Bug in Login', status: 'Open', priority: 'High', assignee: 'Alice', updated_date: '2024-05-01T10:00:00Z' },
  { id: 2, jira_id: 'JIRA-002', title: 'Feature: User Profile', status: 'In Progress', priority: 'Medium', assignee: 'Bob', updated_date: '2024-05-02T11:00:00Z' },
  { id: 3, jira_id: 'JIRA-003', title: 'Documentation for API', status: 'Open', priority: 'Low', assignee: 'Alice', updated_date: '2024-05-03T12:00:00Z' },
  { id: 4, jira_id: 'JIRA-004', title: 'Fix CSS on Homepage', status: 'Closed', priority: 'Medium', assignee: 'Charlie', updated_date: '2024-04-28T15:00:00Z' },
];

describe('TicketList Component', () => {
  beforeEach(() => {
    api.getTickets.mockClear();
  });

  test('renders loading state initially', () => {
    api.getTickets.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<MemoryRouter><TicketList /></MemoryRouter>);
    expect(screen.getByText(/loading tickets.../i)).toBeInTheDocument();
  });

  test('calls api.getTickets on mount and displays tickets in a table', async () => {
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><TicketList /></MemoryRouter>);

    expect(api.getTickets).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      // Check for table headers
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Assignee')).toBeInTheDocument();
      expect(screen.getByText('Updated Date')).toBeInTheDocument();

      // Check for some ticket data
      expect(screen.getByText('Bug in Login')).toBeInTheDocument();
      expect(screen.getByText('JIRA-001')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument(); // Assignee for JIRA-001 & JIRA-003
      expect(screen.getByText('Feature: User Profile')).toBeInTheDocument();
      expect(screen.getByText('JIRA-002')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument(); // Assignee for JIRA-002
    });
  });

  test('displays error message if api.getTickets fails', async () => {
    api.getTickets.mockRejectedValue(new Error('Failed to fetch tickets'));
    render(<MemoryRouter><TicketList /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/failed to load tickets. please try again later./i)).toBeInTheDocument();
    });
  });
  
  test('uses placeholder data if api.getTickets returns no data', async () => {
    api.getTickets.mockResolvedValue({ data: null }); // Simulate API returning null/undefined data
    render(<MemoryRouter><TicketList /></MemoryRouter>);

    await waitFor(() => {
      // TicketList.js placeholder data has "Dashboard Bug Display" and "User Login Issue"
      expect(screen.getByText('Dashboard Bug Display')).toBeInTheDocument();
      expect(screen.getByText('User Login Issue')).toBeInTheDocument();
    });
  });

  test('renders filter input fields', async () => {
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><TicketList /></MemoryRouter>);
    await waitFor(() => { // Wait for loading to finish
      expect(screen.getByPlaceholderText(/filter by status.../i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/filter by assignee.../i)).toBeInTheDocument();
    });
  });

  test('filters tickets by status', async () => {
    const user = userEvent.setup();
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><TicketList /></MemoryRouter>);

    await waitFor(() => { // Wait for initial load
      expect(screen.getByText('Bug in Login')).toBeInTheDocument(); // JIRA-001, Open
    });

    const statusFilterInput = screen.getByPlaceholderText(/filter by status.../i);
    await user.type(statusFilterInput, 'Open');

    await waitFor(() => {
      expect(screen.getByText('Bug in Login')).toBeInTheDocument(); // JIRA-001, Open
      expect(screen.getByText('Documentation for API')).toBeInTheDocument(); // JIRA-003, Open
      expect(screen.queryByText('Feature: User Profile')).not.toBeInTheDocument(); // In Progress
      expect(screen.queryByText('Fix CSS on Homepage')).not.toBeInTheDocument(); // Closed
    });
    
    // Clear filter
    await user.clear(statusFilterInput);
    await user.type(statusFilterInput, ' '); // Or type something that doesn't match any

    await waitFor(() => {
      expect(screen.getByText('Bug in Login')).toBeInTheDocument();
      expect(screen.getByText('Feature: User Profile')).toBeInTheDocument();
    });
  });

  test('filters tickets by assignee', async () => {
    const user = userEvent.setup();
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><TicketList /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Bug in Login')).toBeInTheDocument(); // Alice
    });
    
    const assigneeFilterInput = screen.getByPlaceholderText(/filter by assignee.../i);
    await user.type(assigneeFilterInput, 'Alice');

    await waitFor(() => {
      expect(screen.getByText('Bug in Login')).toBeInTheDocument(); // Alice
      expect(screen.getByText('Documentation for API')).toBeInTheDocument(); // Alice
      expect(screen.queryByText('Feature: User Profile')).not.toBeInTheDocument(); // Bob
      expect(screen.queryByText('Fix CSS on Homepage')).not.toBeInTheDocument(); // Charlie
    });
  });

  test('filters tickets by both status and assignee', async () => {
    const user = userEvent.setup();
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><TicketList /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('Bug in Login')).toBeInTheDocument();
    });

    const statusFilterInput = screen.getByPlaceholderText(/filter by status.../i);
    const assigneeFilterInput = screen.getByPlaceholderText(/filter by assignee.../i);

    await user.type(statusFilterInput, 'Open');
    await user.type(assigneeFilterInput, 'Alice');

    await waitFor(() => {
      // Both JIRA-001 and JIRA-003 are Open and assigned to Alice
      expect(screen.getByText('Bug in Login')).toBeInTheDocument();
      expect(screen.getByText('Documentation for API')).toBeInTheDocument();
      // Others should not be visible
      expect(screen.queryByText('Feature: User Profile')).not.toBeInTheDocument(); 
      expect(screen.queryByText('Fix CSS on Homepage')).not.toBeInTheDocument();
    });
    
    // Change assignee filter to Bob, keeping status as Open
    await user.clear(assigneeFilterInput);
    await user.type(assigneeFilterInput, 'Bob');

    await waitFor(() => {
      // No tickets are 'Open' AND assigned to 'Bob'
      expect(screen.queryByText('Bug in Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Documentation for API')).not.toBeInTheDocument();
      expect(screen.getByText(/no tickets found matching your criteria/i)).toBeInTheDocument();
    });
  });

  test('displays "No tickets found" message if filters result in empty list', async () => {
    const user = userEvent.setup();
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><TicketList /></MemoryRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('Bug in Login')).toBeInTheDocument();
    });

    const statusFilterInput = screen.getByPlaceholderText(/filter by status.../i);
    await user.type(statusFilterInput, 'NonExistentStatus');

    await waitFor(() => {
      expect(screen.getByText(/no tickets found matching your criteria/i)).toBeInTheDocument();
    });
  });
});
