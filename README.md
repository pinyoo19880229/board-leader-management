# VibeJira - Django & React JIRA Integration

VibeJira is a web application that integrates with JIRA to provide a custom interface for viewing and managing JIRA tickets. This project rebuilds the core VibeJira functionalities using a Django backend and a React frontend.

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Project Structure](#project-structure)
3.  [Backend Setup (Django)](#backend-setup-django)
    *   [Environment Variables (Backend)](#environment-variables-backend)
    *   [Running the Backend](#running-the-backend)
    *   [Backend API Endpoints](#backend-api-endpoints)
4.  [Frontend Setup (React)](#frontend-setup-react)
    *   [Environment Variables (Frontend)](#environment-variables-frontend)
    *   [Running the Frontend](#running-the-frontend)
5.  [Running Tests](#running-tests)
    *   [Backend Tests](#backend-tests)
    *   [Frontend Tests](#frontend-tests)

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Python** (version 3.8+ recommended)
*   **pip** (Python package installer)
*   **Node.js** (version 14.x+ or 16.x+ recommended)
*   **npm** (Node package manager, comes with Node.js)
*   **A JIRA Cloud Account**
*   **JIRA Personal Access Token (PAT):**
    *   Log in to your JIRA account.
    *   Go to your profile settings > Personal Access Tokens.
    *   Create a new token with appropriate permissions (e.g., read/write access to issues and projects). Securely store this token.

## Project Structure

The project is organized into two main directories:

*   `vibejira_django/`: Contains the Django backend application.
*   `frontend/`: Contains the React frontend application.

Each directory has its own specific setup and running instructions detailed below. A single comprehensive README in the root directory is used for ease of management.

## Backend Setup (Django)

The backend is built with Django and Django REST Framework.

1.  **Navigate to the backend directory:**
    ```bash
    cd vibejira_django
    ```

2.  **Create a Python virtual environment:**
    It's highly recommended to use a virtual environment to manage project-specific dependencies.
    ```bash
    python3 -m venv venv
    ```

3.  **Activate the virtual environment:**
    *   On macOS and Linux:
        ```bash
        source venv/bin/activate
        ```
    *   On Windows:
        ```bash
        .\venv\Scripts\activate
        ```

4.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    This file includes Django, Django REST Framework, Django CORS Headers, Requests, etc.

5.  **Set up environment variables (Backend):**
    Create a `.env` file in the `vibejira_django/` directory. You can copy the example file:
    ```bash
    cp .env.example .env
    ```
    Then, edit the `.env` file with your specific configurations:

    *   `SECRET_KEY`: A strong, unique secret key for Django. You can generate one using Django's utilities or an online generator. *The one in `.env.example` is for development only and should be changed.*
    *   `DEBUG`: Set to `True` for development mode, or `False` for production.
    *   `JIRA_BASE_URL`: The base URL of your JIRA instance (e.g., `https://your-domain.atlassian.net`).
    *   `JIRA_USER_EMAIL`: The email address associated with your JIRA account (used for Basic Auth with PAT).
    *   `JIRA_PAT`: Your JIRA Personal Access Token.
    *   `DATABASE_URL` (Optional): If you want to use a database other than SQLite (e.g., PostgreSQL), you can specify its URL here (e.g., `postgres://user:password@host:port/dbname`). If not provided, Django defaults to using a local `db.sqlite3` file, which is suitable for development.

6.  **Run database migrations:**
    This command creates the necessary database tables for the application.
    ```bash
    python manage.py migrate
    ```

7.  **Create a superuser (for Django Admin access):**
    This allows you to access the Django admin interface.
    ```bash
    python manage.py createsuperuser
    ```
    Follow the prompts to set a username, email, and password.

### Running the Backend

Once the setup is complete, you can start the Django development server:

```bash
python manage.py runserver
```

By default, the backend server will run on `http://127.0.0.1:8000/`.
The API will be accessible under the `/api/` path.

### Backend API Endpoints

Base URL: `/api/`

Authentication: Most endpoints (except `/api-token-auth/`) require Token Authentication. The token should be included in the `Authorization` header as `Token <your_auth_token>`.

*   **/api-token-auth/**
    *   `POST`: Obtain an authentication token.
        *   Request: `{ "username": "your_username", "password": "your_password" }`
        *   Response: `{ "token": "your_auth_token" }`

*   **/projects/**
    *   `GET`: List all projects.
    *   `POST`: Create a new project.
        *   Example Request: `{ "name": "New Local Project", "jira_key": "NLP", "description": "Optional desc." }`

*   **/projects/{id}/** (where `{id}` is the database PK)
    *   `GET`: Retrieve a specific project.
    *   `PUT`: Update a project's details.
    *   `PATCH`: Partially update a project's details.
    *   `DELETE`: Delete a project.

*   **/tickets/**
    *   `GET`: List all tickets. Supports filtering by `project` (database PK of the project), e.g., `/api/tickets/?project=<project_db_pk>`.
    *   `POST`: Create a new ticket locally.
        *   Example Request: `{ "project": <project_db_pk>, "jira_id": "PROJ-123", "title": "New Ticket", "status": "Open", "priority": "Medium", "created_date": "YYYY-MM-DDTHH:MM:SSZ", "updated_date": "YYYY-MM-DDTHH:MM:SSZ" }` (Note: `created_date` and `updated_date` might be handled automatically or by the serializer depending on model/serializer setup).

*   **/tickets/{jira_id_or_db_pk}/**
    *   `GET`: Retrieve a specific ticket. If `{jira_id_or_db_pk}` is a JIRA ID (e.g., "PROJ-123") not found locally, it attempts to fetch from JIRA. If it's a numeric DB PK, it fetches directly from the database.
    *   `PATCH`: Update a specific ticket (e.g., status). Uses database PK.
        *   Example Request: `{ "status": "In Progress" }`
    *   `DELETE`: Delete a specific ticket. Uses database PK.

*   **/comments/**
    *   `GET`: List all comments. Supports filtering by `ticket` (database PK of the ticket), e.g., `/api/comments/?ticket=<ticket_db_pk>`.
    *   `POST`: Add a comment to a ticket. The `author` is automatically set to the authenticated user, and `created_date` is set automatically by the model (`auto_now_add=True`).
        *   Example Request: `{ "ticket": <ticket_db_pk>, "body": "This is a new comment." }`

*   **/comments/{id}/** (where `{id}` is the database PK)
    *   `GET`: Retrieve a specific comment.
    *   `PUT`/`PATCH`: Update a comment.
    *   `DELETE`: Delete a comment.


## Frontend Setup (React)

The frontend is built with React and uses `axios` for API communication.

1.  **Navigate to the frontend directory:**
    From the project root:
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This command installs all necessary packages listed in `package.json`.

3.  **Set up environment variables (Frontend):**
    Create a `.env` file in the `frontend/` directory. You can copy the example file:
    ```bash
    cp .env.example .env
    ```
    Then, edit the `.env` file with your specific configurations:

    *   `REACT_APP_API_URL`: The full base URL for the Django backend API. If the backend is running locally on port 8000, this will typically be `http://localhost:8000/api/`.
    *   `REACT_APP_JIRA_BASE_URL`: The base URL of your JIRA instance (e.g., `https://your-domain.atlassian.net`). This is used for constructing direct links to JIRA tickets.

### Running the Frontend

Once the setup is complete, you can start the React development server:

```bash
npm start
```

This will usually open the application in your default web browser at `http://localhost:3000/`. The frontend will make API requests to the backend URL specified in `REACT_APP_API_URL`. Ensure your Django backend is running and accessible for the frontend to work correctly.

## Running Tests

### Backend Tests

1.  Navigate to the `vibejira_django/` directory.
2.  Ensure your virtual environment is activated.
3.  Run the tests:
    ```bash
    python manage.py test jira_integration
    ```
    This command will discover and run all tests within the `jira_integration/tests.py` file. For more detailed instructions, see the comments within the test file itself.

### Frontend Tests

1.  Navigate to the `frontend/` directory.
2.  Run the tests:
    ```bash
    npm test
    ```
    This will start Jest in watch mode. Press `a` to run all tests. For more detailed instructions, see the comments within `frontend/src/App.test.js`.

---

This README provides a comprehensive guide to getting the VibeJira application up and running. If you encounter any issues, please double-check the environment variable configurations and ensure all prerequisites are met.
For the backend API, note the distinction in how `/tickets/{identifier}/` GET requests are handled (can be `jira_id` or `db_pk`) versus PATCH/DELETE requests (which expect `db_pk`).
The comment creation endpoint (`/api/comments/` POST) now automatically handles the author and creation date based on the authenticated user and timestamp.I have updated the root `README.md` file with comprehensive instructions for the entire project.

**Summary of Changes and Content in `README.md`:**

1.  **Consolidation:** A single root `README.md` is used, and the previous `vibejira_django/README.md` has been deleted to avoid redundancy.
2.  **Prerequisites:** Clearly lists Python, pip, Node.js, npm, JIRA account, and JIRA PAT as requirements.
3.  **Project Structure:** Briefly explains the `vibejira_django` and `frontend` directories.
4.  **Backend Setup (Django):**
    *   Detailed steps for navigating to the directory, creating/activating a Python virtual environment, and installing dependencies from `requirements.txt`.
    *   Comprehensive instructions for setting up the `vibejira_django/.env` file, listing all required environment variables (`SECRET_KEY`, `DEBUG`, `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_PAT`, and optional `DATABASE_URL` with explanation of SQLite default).
    *   Commands for running database migrations (`python manage.py migrate`) and creating a superuser (`python manage.py createsuperuser`).
    *   Command for running the Django development server (`python manage.py runserver`).
    *   **API Endpoint Documentation:**
        *   Lists main endpoints: `/api-token-auth/`, `/projects/`, `/projects/{id}/`, `/tickets/`, `/tickets/{jira_id_or_db_pk}/`, `/comments/`, `/comments/{id}/`.
        *   Describes purpose, main operations (GET, POST, PATCH, DELETE), and authentication requirements.
        *   Provides example requests for token auth, project creation, ticket creation, ticket update (status), and comment creation.
        *   Clarifies that for tickets, `GET /api/tickets/{identifier}/` can use `jira_id` (with JIRA fallback) or database PK, while `PATCH` and `DELETE` expect the database PK.
        *   Notes that for comment creation, `author` and `created_date` are now automatically handled by the backend.
5.  **Frontend Setup (React):**
    *   Instructions for navigating to the `frontend` directory and installing dependencies (`npm install`).
    *   Instructions for setting up the `frontend/.env` file, listing required environment variables (`REACT_APP_API_URL`, `REACT_APP_JIRA_BASE_URL`).
    *   Command for running the React development server (`npm start`).
6.  **Running Tests:**
    *   Separate, clear instructions for running backend tests (`python manage.py test jira_integration`) and frontend tests (`npm test`), including navigating to the correct directories and activating virtual environments where applicable.

The README is structured to guide a developer through the complete setup and execution of both the backend and frontend components of the VibeJira project, as well as how to run the automated tests for each part.
The API endpoint documentation has been updated to reflect the latest changes, particularly regarding comment creation and ticket ID handling.
