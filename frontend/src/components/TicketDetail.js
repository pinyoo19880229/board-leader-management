import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTicketById, updateTicketStatus, addTicketComment } from '../services/api';
import './TicketDetail.css'; // Create this for styling

// Example statuses - in a real app, these might come from an API or config
const AVAILABLE_STATUSES = ["Open", "In Progress", "Triage Pending", "Waiting", "Resolved", "Closed", "Done", "Ongoing", "Rejected"];

function TicketDetail() {
  const { id } = useParams(); // This 'id' will be the jira_id or local id
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const jiraBaseUrl = process.env.REACT_APP_JIRA_BASE_URL;

  const fetchTicketDetails = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`TicketDetail: Fetching ticket with ID: ${id}...`);
      const response = await getTicketById(id);

      if (response && response.data) {
        setTicket(response.data);
      } else {
        console.log("TicketDetail: getTicketById did not return data. Using placeholder or error.");
        setTicket({ 
          id: id, 
          title: `Placeholder for Ticket ${id}`, 
          description: 'This is placeholder content as the ticket was not found or API is unavailable.',
          status: 'Unknown',
          priority: 'Unknown',
          jira_id: id, // Assuming the id from URL is jira_id
          comments: [{id: 1, author: "System", body: "This is a placeholder comment.", created_date: new Date().toISOString()}],
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        });
      }
      setError(null);
    } catch (err) {
      console.error(`TicketDetail: Failed to fetch ticket ${id}:`, err);
      setError(`Failed to load ticket ${id}. It might not exist or there was a network issue.`);
      setTicket(null); // Explicitly set to null on error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
    }
  }, [id, fetchTicketDetails]);

  const handleStatusChange = async (newStatus) => {
    if (!ticket || !ticket.id) {
      console.error("TicketDetail: Cannot update status, ticket ID is missing.");
      return;
    }
    setIsUpdatingStatus(true);
    try {
      console.log(`TicketDetail: Updating status for ticket ${ticket.id} to ${newStatus}`);
      const updatedTicket = await updateTicketStatus(ticket.id, { status: newStatus }); // Pass as object
      setTicket(updatedTicket.data); // Assuming API returns the updated ticket
      console.log("TicketDetail: Status updated successfully.");
    } catch (err) {
      console.error('TicketDetail: Failed to update status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim() || !ticket || !ticket.id) {
      console.log("TicketDetail: Comment is empty or ticket ID is missing.");
      return;
    }
    setIsSubmittingComment(true);
    try {
      console.log(`TicketDetail: Adding comment to ticket ${ticket.id}`);
      // Assuming addTicketComment expects ticket.id (PK) not ticket.jira_id
      const response = await addTicketComment(ticket.id, { body: newComment });
      // Refresh ticket details to get the new comment
      // Or, if API returns the new comment, append it to ticket.comments
      if (response && response.data) {
        // Option 1: API returns full ticket or just the new comment
        // If just new comment: setTicket(prev => ({...prev, comments: [...prev.comments, response.data]}));
        // If API returns updated ticket:
        // setTicket(response.data) 
        // For now, re-fetching is a safe bet if comment endpoint doesn't return full ticket
        fetchTicketDetails(); 
      }
      setNewComment('');
      console.log("TicketDetail: Comment added successfully.");
    } catch (err) {
      console.error('TicketDetail: Failed to add comment:', err);
      setError('Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };


  if (loading) {
    return <p>Loading ticket details for ID: {id}...</p>;
  }

  if (error && !ticket) { // Show error prominently if ticket couldn't be loaded at all
    return <p className="error-message">{error}</p>;
  }
  
  if (!ticket) { // Should be covered by error state, but as a fallback
    return <p>No ticket data available for ID: {id}.</p>;
  }

  // Fallback for comments if not present
  const comments = ticket.comments || [];

  return (
    <div className="ticket-detail-container">
      {error && <p className="error-message">{error}</p>} {/* Show non-critical errors here */}
      <div className="ticket-header">
        <h2>{ticket.title || 'N/A'}</h2>
        {ticket.jira_id && jiraBaseUrl && (
          <a 
            href={`${jiraBaseUrl}/browse/${ticket.jira_id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="jira-link-button"
          >
            View in JIRA
          </a>
        )}
      </div>

      <div className="ticket-info">
        <p><strong>Jira Key:</strong> {ticket.jira_id || 'N/A'}</p>
        <p><strong>Status:</strong> {ticket.status || 'N/A'}</p>
        <p><strong>Priority:</strong> {ticket.priority || 'N/A'}</p>
        <p><strong>Assignee:</strong> {ticket.assignee || 'Unassigned'}</p>
        <p><strong>Reporter:</strong> {ticket.reporter || 'N/A'}</p>
        <p><strong>Created:</strong> {ticket.created_date ? new Date(ticket.created_date).toLocaleString() : 'N/A'}</p>
        <p><strong>Updated:</strong> {ticket.updated_date ? new Date(ticket.updated_date).toLocaleString() : 'N/A'}</p>
        <p><strong>Due Date:</strong> {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'N/A'}</p>
      </div>

      <div className="ticket-description">
        <h3>Description</h3>
        <p>{ticket.description || 'No description available.'}</p>
      </div>

      <div className="ticket-status-update">
        <h3>Update Status</h3>
        {AVAILABLE_STATUSES.map(status => (
          <button 
            key={status} 
            onClick={() => handleStatusChange(status)}
            disabled={isUpdatingStatus || ticket.status === status}
            className={ticket.status === status ? 'active-status' : ''}
          >
            {isUpdatingStatus && ticket.status !== status ? 'Updating...' : `Mark as ${status}`}
          </button>
        ))}
      </div>

      <div className="ticket-comments">
        <h3>Comments ({comments.length})</h3>
        {comments.length > 0 ? (
          <ul>
            {comments.map(comment => (
              <li key={comment.id}>
                <p><strong>{comment.author || 'Unknown User'}</strong> ({comment.created_date ? new Date(comment.created_date).toLocaleString() : 'N/A'}):</p>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No comments yet.</p>
        )}
      </div>

      <div className="add-comment-form">
        <h3>Add a Comment</h3>
        <form onSubmit={handleAddComment}>
          <textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your comment here..."
            rows="4"
            required
            disabled={isSubmittingComment}
          />
          <button type="submit" disabled={isSubmittingComment}>
            {isSubmittingComment ? 'Submitting...' : 'Add Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TicketDetail;
