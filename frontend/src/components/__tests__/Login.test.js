import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // For more realistic user interactions
import Login from '../Login';
import * as api from '../../services/api'; // So we can mock api.login

// Mock the api.login function
jest.mock('../../services/api');

// Optional: Mock react-router-dom's useNavigate if you use it for redirection
// const mockNavigate = jest.fn();
// jest.mock('react-router-dom', () => ({
//   ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
//   useNavigate: () => mockNavigate,
// }));

describe('Login Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    api.login.mockClear();
    // mockNavigate.mockClear(); // if using useNavigate mock
    localStorage.clear(); // Clear localStorage to ensure no leftover tokens
  });

  test('renders login form correctly', () => {
    render(<Login />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('allows user to type into username and password fields', async () => {
    const user = userEvent.setup();
    render(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'testuser');
    expect(usernameInput.value).toBe('testuser');

    await user.type(passwordInput, 'password123');
    expect(passwordInput.value).toBe('password123');
  });

  test('calls api.login with correct credentials on form submission and handles success', async () => {
    const user = userEvent.setup();
    const testUsername = 'testuser';
    const testPassword = 'password123';
    const mockToken = 'fake-auth-token';

    api.login.mockResolvedValue({ token: mockToken }); // Simulate successful login

    render(<Login />);

    await user.type(screen.getByLabelText(/username/i), testUsername);
    await user.type(screen.getByLabelText(/password/i), testPassword);
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(api.login).toHaveBeenCalledTimes(1);
    expect(api.login).toHaveBeenCalledWith(testUsername, testPassword);

    // Wait for any async state updates related to API call
    await waitFor(() => {
      // Check if token is stored
      expect(localStorage.getItem('authToken')).toBe(mockToken);
    });
    
    // Optional: Check for navigation if implemented
    // expect(mockNavigate).toHaveBeenCalledWith('/'); 

    // Check for success message or UI change (if any)
    // For this component, there isn't an explicit success message, but no error should be shown.
    expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
  });

  test('shows an error message on failed login', async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(new Error('Invalid credentials')); // Simulate failed login

    render(<Login />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(api.login).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(/login failed. please check your credentials./i)).toBeInTheDocument();
    });

    expect(localStorage.getItem('authToken')).toBeNull();
    // expect(mockNavigate).not.toHaveBeenCalled(); // if using useNavigate mock
  });

  test('submit button is disabled while loading', async () => {
    const user = userEvent.setup();
    // Make the API call take time
    api.login.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ token: 'abc' }), 100)));
    
    render(<Login />);
    
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    const button = screen.getByRole('button', { name: /login/i });
    fireEvent.click(button); // Use fireEvent for simple click without async user events needed before this point

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/logging in.../i);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent(/login/i);
    });
  });
});
