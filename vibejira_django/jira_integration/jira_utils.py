import os
import requests
from requests.auth import HTTPBasicAuth
from django.conf import settings

def get_jira_issue(issue_key_or_id):
    """
    Fetches a JIRA issue by its key or ID.
    """
    jira_base_url = os.getenv('JIRA_BASE_URL')
    jira_pat = os.getenv('JIRA_PAT')
    jira_user_email = os.getenv('JIRA_USER_EMAIL') # Needed for Basic Auth with PAT

    if not all([jira_base_url, jira_pat, jira_user_email]):
        # Consider logging this error as well
        return {"error": "JIRA_BASE_URL, JIRA_PAT, or JIRA_USER_EMAIL environment variables not set."}

    api_url = f"{jira_base_url}/rest/api/3/issue/{issue_key_or_id}"
    
    # JIRA Cloud API expects Basic Auth with email and PAT as password
    auth = HTTPBasicAuth(jira_user_email, jira_pat)
    
    headers = {
        "Accept": "application/json"
    }

    try:
        response = requests.get(api_url, headers=headers, auth=auth, timeout=10)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        # Handle specific HTTP errors if needed
        return {"error": f"HTTP error occurred: {http_err}", "status_code": response.status_code, "response_text": response.text}
    except requests.exceptions.ConnectionError as conn_err:
        return {"error": f"Error connecting to JIRA: {conn_err}"}
    except requests.exceptions.Timeout as timeout_err:
        return {"error": f"Request to JIRA timed out: {timeout_err}"}
    except requests.exceptions.RequestException as req_err:
        return {"error": f"An unexpected error occurred with the JIRA request: {req_err}"}
