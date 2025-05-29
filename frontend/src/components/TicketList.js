import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getTickets } from '../services/api';
import './TicketList.css'; // Create this for styling

function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        console.log("TicketList: Fetching tickets...");
        const response = await getTickets();
        
        if (response && response.data) {
          setTickets(response.data);
        } else {
          console.log("TicketList: getTickets did not return data, using placeholder data.");
          setTickets([
            { id: 1, jira_id: 'JIRA-101', title: 'Dashboard Bug Display', status: 'Ongoing', priority: 'Highest', assignee: 'Dev1', updated_date: '2024-05-01T10:00:00Z' },
            { id: 2, jira_id: 'JIRA-102', title: 'User Login Issue', status: 'Triage Pending', priority: 'High', assignee: 'Dev2', updated_date: '2024-05-02T11:00:00Z' },
            { id: 3, jira_id: 'JIRA-103', title: 'Setup CI/CD Pipeline', status: 'Waiting', priority: 'Medium', assignee: 'DevOps', updated_date: '2024-04-28T15:00:00Z' },
            { id: 4, jira_id: 'JIRA-104', title: 'Documentation Update', status: 'Done', priority: 'Low', assignee: 'TechWriter', updated_date: '2024-04-30T09:00:00Z' },
            { id: 5, jira_id: 'JIRA-105', title: 'Feature Request X - Rejected', status: 'Rejected', priority: 'Medium', assignee: 'ProductOwner', updated_date: '2024-04-29T12:00:00Z' },
          ]);
        }
        setError(null);
      } catch (err) {
        console.error('TicketList: Failed to fetch tickets:', err);
        setError('Failed to load tickets. Please try again later.');
        setTickets([
            { id: 1, jira_id: 'ERR-1', title: 'Failed Load Ticket 1', status: 'Error', priority: 'Unknown', assignee: 'N/A', updated_date: new Date().toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const statusMatch = statusFilter ? ticket.status && ticket.status.toLowerCase().includes(statusFilter.toLowerCase()) : true;
      const assigneeMatch = assigneeFilter ? ticket.assignee && ticket.assignee.toLowerCase().includes(assigneeFilter.toLowerCase()) : true;
      return statusMatch && assigneeMatch;
    });
  }, [tickets, statusFilter, assigneeFilter]);

  if (loading) {
    return <p>Loading tickets...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="ticket-list-container">
      <h2>Ticket List</h2>
      
      <div className="filters">
        <input 
          type="text" 
          placeholder="Filter by status..." 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
        />
        <input 
          type="text" 
          placeholder="Filter by assignee..." 
          value={assigneeFilter} 
          onChange={(e) => setAssigneeFilter(e.target.value)} 
        />
      </div>

      {filteredTickets.length > 0 ? (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assignee</th>
              <th>Updated Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map(ticket => (
              <tr key={ticket.id || ticket.jira_id}>
                <td>
                  <Link to={`/tickets/${ticket.jira_id || ticket.id}`}>
                    {ticket.jira_id || ticket.id}
                  </Link>
                </td>
                <td>{ticket.title}</td>
                <td>{ticket.status}</td>
                <td>{ticket.priority || 'N/A'}</td>
                <td>{ticket.assignee || 'Unassigned'}</td>
                <td>{new Date(ticket.updated_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No tickets found matching your criteria.</p>
      )}
    </div>
  );
}

export default TicketList;
