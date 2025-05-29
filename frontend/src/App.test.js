import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Use MemoryRouter for testing routes
import App from './App';

// Mock child components to isolate App.js tests
// and avoid testing implementation details of children.
jest.mock('./components/Dashboard', () => () => <div>Dashboard Page Mock</div>);
jest.mock('./components/TicketList', () => () => <div>Ticket List Page Mock</div>);
jest.mock('./components/TicketDetail', () => () => <div>Ticket Detail Page Mock</div>);
jest.mock('./components/Login', () => () => <div>Login Page Mock</div>);

describe('App Component and Routing', () => {
  test('renders main navigation links', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  });

  test('navigating to / renders Dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboard Page Mock')).toBeInTheDocument();
  });

  test('navigating to /tickets renders TicketList', () => {
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <App />
      </MemoryRouter>
    );
    // Click the "Tickets" link to navigate
    // fireEvent.click(screen.getByRole('link', { name: /tickets/i })); // Not needed if initialEntries is set
    expect(screen.getByText('Ticket List Page Mock')).toBeInTheDocument();
  });
  
  test('navigating to /login renders Login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
  });

  test('navigating to a ticket detail page renders TicketDetail', () => {
    // Example ticket ID, this will be caught by the :id parameter
    const ticketId = 'JIRA-123'; 
    render(
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <App />
      </MemoryRouter>
    );
    // Check if the mock (which doesn't use the ID) is rendered
    expect(screen.getByText('Ticket Detail Page Mock')).toBeInTheDocument();
  });

  test('navigating to an unknown route could render a fallback or default (e.g. Dashboard)', () => {
    // Create React App router setup might default to the first route or show nothing if not matched.
    // This test depends on how your <Routes> is configured for unmatched paths.
    // If there's no specific "Not Found" page, it might render the Dashboard (if path="/")
    // or simply not render the specific content of other pages.
    render(
      <MemoryRouter initialEntries={['/some/unknown/route']}>
        <App />
      </MemoryRouter>
    );
    // Example: Assuming it defaults to Dashboard or a generic part of App.js is still visible.
    // For this App.js, if no route matches, it might render nothing from <Routes>,
    // but the nav bar will still be there.
    // If you have a <Route path="*" element={<NotFoundComponent />} /> this would be different.
    // For now, we'll check that one of the specific page mocks is NOT there.
    expect(screen.queryByText('Ticket List Page Mock')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page Mock')).not.toBeInTheDocument();
    // And that the nav is still there
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });
});

// Instructions for running tests:
//
// To run these tests, navigate to the `frontend` directory in your terminal
// and execute the following command:
//
// ```bash
// npm test
// ```
//
// This will start Jest in watch mode, automatically running tests when files change.
// You can press 'a' to run all tests if not in watch mode or if it's the first run.
//
// Ensure that you have all dependencies installed by running `npm install`
// in the `frontend` directory before running tests.
//
// The tests use `@testing-library/react` for rendering and interacting with components,
// and Jest for the test runner and assertion functions. `jest-dom` provides
// custom matchers like `toBeInTheDocument()`.
//
// Child components (`Dashboard`, `TicketList`, `TicketDetail`, `Login`) are mocked
// at the top of this test file using `jest.mock()`. This is crucial for unit testing
// `App.js` in isolation, focusing on its rendering and routing logic without
// depending on the behavior or content of its child components.
//
// `MemoryRouter` is used to simulate routing in a test environment without a browser.
// `initialEntries` prop of `MemoryRouter` allows setting the starting URL for each test case.
//
// The test for an unknown route is a basic example. In a real application, you might
// have a specific "Not Found" component that you would assert is rendered for unknown paths.
