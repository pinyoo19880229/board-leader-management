import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // For <Link> components
import Dashboard from '../Dashboard';
import * as api from '../../services/api';

jest.mock('../../services/api');

const mockTicketsData = [
  { id: 1, jira_id: 'JIRA-101', title: 'Dashboard Bug Display', status: 'Ongoing', priority: 'Highest', assignee: 'Dev1', updated_date: '2024-05-01T10:00:00Z' },
  { id: 2, jira_id: 'JIRA-102', title: 'User Login Issue', status: 'Triage Pending', priority: 'High', assignee: 'Dev2', updated_date: '2024-05-02T11:00:00Z' },
  { id: 3, jira_id: 'JIRA-103', title: 'Setup CI/CD Pipeline', status: 'Waiting', priority: 'Medium', assignee: 'DevOps', updated_date: '2024-04-28T15:00:00Z' },
  { id: 4, jira_id: 'JIRA-104', title: 'Documentation Update', status: 'Done', priority: 'Low', assignee: 'TechWriter', updated_date: '2024-04-30T09:00:00Z' },
  { id: 5, jira_id: 'JIRA-105', title: 'Feature Request X - Rejected', status: 'Rejected', priority: 'Medium', assignee: 'ProductOwner', updated_date: '2024-04-29T12:00:00Z' },
  { id: 6, jira_id: 'JIRA-106', title: 'API Performance Bottleneck', status: 'Ongoing', priority: 'Highest', assignee: 'Dev3', updated_date: '2024-05-03T14:00:00Z' },
  { id: 7, jira_id: 'JIRA-107', title: 'New User Onboarding Flow', status: 'Open', priority: 'High', assignee: 'UXTeam', updated_date: '2024-05-03T10:00:00Z' },
  { id: 8, jira_id: 'JIRA-108', title: 'Refactor Legacy Code Module', status: 'In Progress', priority: 'Medium', assignee: 'Dev2', updated_date: '2024-05-02T16:00:00Z' },
  { id: 9, jira_id: 'JIRA-109', title: 'Fix Typo on Homepage', status: 'Resolved', priority: 'Lowest', assignee: 'Dev1', updated_date: '2024-04-25T17:00:00Z' },
  { id: 10, jira_id: 'JIRA-110', title: 'Server Upgrade', status: 'Closed', priority: null, assignee: 'SysAdmin', updated_date: '2024-04-20T10:00:00Z' },
];

// Defined in Dashboard.js
const KEY_STATUSES = ["Ongoing", "Triage Pending", "Waiting", "Done", "Rejected", "Open", "In Progress", "Resolved", "Closed"];

describe('Dashboard Component', () => {
  beforeEach(() => {
    api.getTickets.mockClear();
  });

  test('renders loading state initially', () => {
    api.getTickets.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByText(/loading dashboard.../i)).toBeInTheDocument();
  });

  test('calls api.getTickets on mount and displays summary cards and ticket tables', async () => {
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(api.getTickets).toHaveBeenCalledTimes(1);

    // Wait for loading to complete and data to be processed
    await waitFor(() => {
      // Check for summary cards based on KEY_STATUSES and mock data
      // Example: Ongoing has 2 tickets
      const ongoingCard = screen.getByText('Ongoing').closest('.summary-card');
      expect(ongoingCard).toHaveTextContent('2'); 
      
      // Triage Pending has 1 ticket
      const triagePendingCard = screen.getByText('Triage Pending').closest('.summary-card');
      expect(triagePendingCard).toHaveTextContent('1');

      // Done has 1 ticket
      const doneCard = screen.getByText('Done').closest('.summary-card');
      expect(doneCard).toHaveTextContent('1');
    });

    // Check for priority group headers (P1, P2, Other)
    // Default state is open, so tables should be visible
    expect(screen.getByText(/P1 Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/P2 Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Other Tickets/i)).toBeInTheDocument();

    // Check if some tickets are rendered in tables
    // P1: JIRA-101, JIRA-106 (Highest), JIRA-102, JIRA-107 (High)
    await waitFor(() => {
      expect(screen.getByText('Dashboard Bug Display')).toBeInTheDocument(); // JIRA-101 (Highest)
      expect(screen.getByText('User Login Issue')).toBeInTheDocument();    // JIRA-102 (High)
    });
    
    // P2: JIRA-103, JIRA-105, JIRA-108 (Medium)
    await waitFor(() => {
      expect(screen.getByText('Setup CI/CD Pipeline')).toBeInTheDocument(); // JIRA-103 (Medium)
    });

    // Other: JIRA-104 (Low), JIRA-109 (Lowest), JIRA-110 (null)
    await waitFor(() => {
      expect(screen.getByText('Documentation Update')).toBeInTheDocument(); // JIRA-104 (Low)
    });
  });

  test('displays error message if api.getTickets fails', async () => {
    api.getTickets.mockRejectedValue(new Error('Failed to fetch'));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard data. please try again later./i)).toBeInTheDocument();
    });
  });

  test('uses placeholder data if api.getTickets returns no data', async () => {
    api.getTickets.mockResolvedValue({ data: null }); // Simulate API returning null/undefined data
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
      // Check for a ticket known to be in the placeholder data
      expect(screen.getByText('Dashboard Bug Display')).toBeInTheDocument(); // From placeholder
      // Check summary card (placeholder data also has 'Ongoing')
      const ongoingCard = screen.getByText('Ongoing').closest('.summary-card');
      expect(ongoingCard).toHaveTextContent('2'); // Based on placeholder data
    });
  });
  
  test('collapsible sections can be toggled', async () => {
    const user = userEvent.setup();
    api.getTickets.mockResolvedValue({ data: mockTicketsData });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    // Wait for initial rendering
    await waitFor(() => {
      expect(screen.getByText('Dashboard Bug Display')).toBeInTheDocument(); // P1 ticket
    });

    const p1Header = screen.getByText(/P1 Tickets/i);
    
    // P1 section is initially open, so its content should be visible
    expect(screen.getByText('Dashboard Bug Display')).toBeVisible();

    // Click to close P1 section
    await user.click(p1Header);
    await waitFor(() => {
      // Check if an element that was visible inside P1 is now not visible
      // Note: .not.toBeVisible() might not work if element is removed from DOM.
      // It's better to query for it and expect it not to be in the document,
      // or if it's hidden by CSS, then .not.toBeVisible() would work.
      // Dashboard.js keeps the table in DOM but conditionally renders it.
      expect(screen.queryByText('Dashboard Bug Display')).not.toBeInTheDocument();
    });

    // Click to re-open P1 section
    await user.click(p1Header);
    await waitFor(() => {
      expect(screen.getByText('Dashboard Bug Display')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Bug Display')).toBeVisible();
    });
  });

  test('displays "No tickets in this priority group" if a group is empty', async () => {
    // Provide data where one group will be empty, e.g., no P1 tickets
    const noP1Tickets = mockTicketsData.filter(
      ticket => !['Highest', 'High'].includes(ticket.priority)
    );
    api.getTickets.mockResolvedValue({ data: noP1Tickets });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    await waitFor(() => {
        // P1 header should still exist
      expect(screen.getByText(/P1 Tickets/i)).toBeInTheDocument();
      // P1 content should show "No tickets" message (assuming it's open by default)
      expect(screen.getByText('No tickets in this priority group.')).toBeInTheDocument();
    });

    // Ensure other groups with tickets still render them
    await waitFor(() => {
       expect(screen.getByText('Setup CI/CD Pipeline')).toBeInTheDocument(); // P2 ticket
    });
  });
});
