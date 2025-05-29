import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export const getTickets = () => {
  console.log('API: Fetching all tickets...');
  return apiClient.get('tickets/');
};

export const getTicketById = (id) => {
  console.log(`API: Fetching ticket with ID: ${id}...`);
  return apiClient.get(`tickets/${id}/`);
};

export const login = async (username, password) => {
  console.log('API: Attempting login...');
  try {
    const response = await apiClient.post('api-token-auth/', { username, password });
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      console.log('API: Login successful, token stored.');
      return response.data;
    }
  } catch (error) {
    console.error('API: Login failed:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const updateTicketStatus = (ticketId, data) => { // data should be an object e.g. { status: newStatus }
  console.log(`API: Updating status for ticket ${ticketId}...`);
  // Note: Django typically expects the PK of the ticket for detail routes.
  // If 'ticketId' here is jira_id, the backend needs to be configured to look up by jira_id
  // or the frontend needs to pass the database PK. Assuming 'ticketId' is the PK for now.
  return apiClient.patch(`tickets/${ticketId}/`, data); 
};

export const addTicketComment = (ticketId, commentData) => { // commentData should be an object e.g. { body: 'New comment' }
  console.log(`API: Adding comment to ticket ${ticketId}...`);
  // As above, assuming ticketId is the PK.
  // The backend endpoint for comments on a ticket might be nested, e.g., /api/tickets/{ticket_pk}/comments/
  // Or it might be a top-level /api/comments/ with ticket_id in the payload.
  // Assuming the DRF default router setup for a CommentViewSet might make it /api/comments/
  // For this to work as tickets/{ticketId}/comments/, custom routing is needed on backend or adjustments here.
  // Let's assume for now the backend is set up to accept POST on /api/comments/ and requires a ticket ID in payload.
  // Or, if the backend is setup for nested routes like /tickets/{ticket_pk}/add_comment/
  // This current implementation assumes /api/comments/ and that the serializer handles linking to the ticket.
  // A more typical DRF approach for nested would be:
  // return apiClient.post(`tickets/${ticketId}/comments/`, commentData);
  // For now, let's create a new comment and assume it's linked via ticket ID in payload.
  // This requires CommentSerializer to accept 'ticket' field (PK).
  return apiClient.post(`comments/`, { ...commentData, ticket: ticketId });
};


export default apiClient;
