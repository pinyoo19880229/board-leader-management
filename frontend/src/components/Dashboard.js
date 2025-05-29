import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTickets } from '../services/api';
import './Dashboard.css'; // Create this file for styling

// Define a fixed set of statuses for summary cards
const KEY_STATUSES = ["Ongoing", "Triage Pending", "Waiting", "Done", "Rejected", "Open", "In Progress", "Resolved", "Closed"]; 
// Define priority groups
const PRIORITY_GROUPS = {
  P1: ['Highest', 'High'],
  P2: ['Medium'],
  Other: ['Low', 'Lowest', 'Undefined', null, ''], // Include null or empty for tickets without priority
};

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryCounts, setSummaryCounts] = useState({});
  const [groupedTickets, setGroupedTickets] = useState({});
  const [openSections, setOpenSections] = useState({ P1: true, P2: true, Other: true });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log("Dashboard: Fetching tickets...");
        const response = await getTickets();
        
        let fetchedTickets = [];
        if (response && response.data) {
          fetchedTickets = response.data;
        } else {
          console.log("Dashboard: getTickets did not return data, using placeholder data.");
          // Placeholder data if API is not yet returning real data or fails
          fetchedTickets = [
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
        }
        setTickets(fetchedTickets);

        // Calculate summary counts
        const counts = {};
        KEY_STATUSES.forEach(status => counts[status] = 0); // Initialize all key statuses to 0
        fetchedTickets.forEach(ticket => {
          if (KEY_STATUSES.includes(ticket.status)) {
            counts[ticket.status]++;
          } else {
            // Optional: group unknown statuses under a generic key
            counts['Other Statuses'] = (counts['Other Statuses'] || 0) + 1;
          }
        });
        setSummaryCounts(counts);

        // Group tickets by priority
        const groups = { P1: [], P2: [], Other: [] };
        fetchedTickets.forEach(ticket => {
          let assignedGroup = false;
          for (const groupName in PRIORITY_GROUPS) {
            if (PRIORITY_GROUPS[groupName].includes(ticket.priority)) {
              groups[groupName].push(ticket);
              assignedGroup = true;
              break;
            }
          }
          if (!assignedGroup) { // If no specific priority match, assign to 'Other'
            groups.Other.push(ticket);
          }
        });
        setGroupedTickets(groups);
        setError(null);
      } catch (err) {
        console.error('Dashboard: Failed to fetch tickets:', err);
        setError('Failed to load dashboard data. Please try again later.');
        // Set placeholder data on error
        setTickets([
            { id: 1, jira_id: 'ERR-101', title: 'Error Loading Ticket 1', status: 'Error', priority: 'Unknown', assignee: 'N/A', updated_date: new Date().toISOString() },
            { id: 2, jira_id: 'ERR-102', title: 'Error Loading Ticket 2', status: 'Error', priority: 'Unknown', assignee: 'N/A', updated_date: new Date().toISOString() },
        ]);
        setSummaryCounts(KEY_STATUSES.reduce((acc, st) => ({...acc, [st]: 0}), {}));
        setGroupedTickets({ P1: [], P2: [], Other: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="summary-cards">
        {KEY_STATUSES.map(status => (
          summaryCounts[status] > 0 && // Only display card if count > 0
          <div key={status} className="summary-card">
            <h4>{status}</h4>
            <p>{summaryCounts[status]}</p>
          </div>
        ))}
        {summaryCounts['Other Statuses'] > 0 &&
            <div key="Other Statuses" className="summary-card">
                <h4>Other Statuses</h4>
                <p>{summaryCounts['Other Statuses']}</p>
            </div>
        }
      </div>

      <div className="ticket-tables">
        {Object.keys(groupedTickets).map(priorityGroup => (
          <div key={priorityGroup} className="priority-section">
            <h3 onClick={() => toggleSection(priorityGroup)} style={{cursor: 'pointer'}}>
              {priorityGroup} Tickets ({groupedTickets[priorityGroup].length}) {openSections[priorityGroup] ? '▼' : '►'}
            </h3>
            {openSections[priorityGroup] && groupedTickets[priorityGroup].length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Updated Date</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTickets[priorityGroup].map(ticket => (
                    <tr key={ticket.id || ticket.jira_id}>
                      <td>
                        <Link to={`/tickets/${ticket.jira_id || ticket.id}`}>
                          {ticket.jira_id || ticket.id}
                        </Link>
                      </td>
                      <td>{ticket.title}</td>
                      <td>{ticket.status}</td>
                      <td>{ticket.assignee || 'Unassigned'}</td>
                      <td>{new Date(ticket.updated_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {openSections[priorityGroup] && groupedTickets[priorityGroup].length === 0 && (
              <p>No tickets in this priority group.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
