from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock # Added MagicMock

from .models import Project, Ticket, Comment
# Serializers are not directly used in these tests but good to have for reference
# from .serializers import ProjectSerializer, TicketSerializer, CommentSerializer

# Environment variables for JIRA are not needed for most tests due to mocking

class AuthTokenTests(APITestCase):
    def setUp(self):
        self.username = "testuser_auth"
        self.password = "testpassword123"
        self.user = User.objects.create_user(username=self.username, password=self.password)
        # Ensure your project's urls.py has 'api-token-auth' as the name for the token view
        self.token_url = reverse('api-token-auth') 

    def test_obtain_auth_token_success(self):
        """
        Ensure users can obtain an authentication token with valid credentials.
        """
        response = self.client.post(self.token_url, {'username': self.username, 'password': self.password}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_obtain_auth_token_failure_invalid_credentials(self):
        """
        Ensure token request fails with invalid credentials.
        """
        response = self.client.post(self.token_url, {'username': self.username, 'password': 'wrongpassword'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('token', response.data)

    def test_obtain_auth_token_failure_missing_credentials(self):
        """
        Ensure token request fails if credentials are not provided.
        """
        response = self.client.post(self.token_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('token', response.data)


class BaseAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls): # Use setUpTestData for data that doesn't change per test method
        cls.api_username = "testuser_api"
        cls.api_password = "testpassword_api123"
        cls.user = User.objects.create_user(username=cls.api_username, password=cls.api_password, email="testuser_api@example.com")

        cls.project1_data = {'name': 'Test Project 1', 'jira_key': 'TP1'}
        cls.project1 = Project.objects.create(**cls.project1_data)

        cls.ticket1_data = {
            'project': cls.project1,
            'jira_id': 'TP1-1', # This will be used for lookup in retrieve
            'title': 'Test Ticket 1 for TP1',
            'status': 'Open',
            'priority': 'High',
            'created_date': '2024-01-01T00:00:00Z',
            'updated_date': '2024-01-01T00:00:00Z'
        }
        cls.ticket1 = Ticket.objects.create(**cls.ticket1_data)

        cls.comment1_data = {
            'ticket': cls.ticket1,
            'author': cls.user.email, # Link comment to the test user
            'body': 'This is the first comment on TP1-1.',
            'created_date': '2024-01-01T01:00:00Z'
        }
        cls.comment1 = Comment.objects.create(**cls.comment1_data)

    def setUp(self): # setUp for things that might change per test or client instance
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)


class ProjectAPITests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.projects_url = reverse('project-list') 

    def test_get_project_list_unauthenticated(self):
        unauth_client = APIClient()
        response = unauth_client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_project_list_authenticated(self):
        response = self.client.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), Project.objects.count()) 
        self.assertEqual(response.data[0]['name'], self.project1.name)

    def test_create_project_authenticated_valid_data(self):
        new_project_data = {'name': 'New Project Alpha', 'jira_key': 'NPA', 'description': 'A brand new project.'}
        response = self.client.post(self.projects_url, new_project_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(Project.objects.filter(jira_key='NPA').exists())

    def test_create_project_authenticated_invalid_data_missing_name(self):
        invalid_data = {'jira_key': 'INVKEY'}
        response = self.client.post(self.projects_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_create_project_authenticated_invalid_data_duplicate_jira_key(self):
        invalid_data = {'name': 'Duplicate Key Project', 'jira_key': self.project1.jira_key}
        response = self.client.post(self.projects_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('jira_key', response.data)

    def test_get_project_retrieve_authenticated_exists(self):
        url = reverse('project-detail', kwargs={'pk': self.project1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.project1.name)

    def test_get_project_retrieve_authenticated_not_exists(self):
        non_existent_pk = self.project1.pk + 999
        url = reverse('project-detail', kwargs={'pk': non_existent_pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_project_put_authenticated(self):
        url = reverse('project-detail', kwargs={'pk': self.project1.pk})
        updated_data = {'name': 'Project 1 Updated Name', 'jira_key': 'TP1U', 'description': 'Updated description.'}
        response = self.client.put(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project1.refresh_from_db()
        self.assertEqual(self.project1.name, updated_data['name'])
        self.assertEqual(self.project1.jira_key, updated_data['jira_key'])

    def test_update_project_patch_authenticated(self):
        url = reverse('project-detail', kwargs={'pk': self.project1.pk})
        partial_update_data = {'description': 'Only description updated.'}
        response = self.client.patch(url, partial_update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project1.refresh_from_db()
        self.assertEqual(self.project1.description, partial_update_data['description'])

    def test_delete_project_authenticated(self):
        project_to_delete = Project.objects.create(name="To Be Deleted", jira_key="TBD")
        url = reverse('project-detail', kwargs={'pk': project_to_delete.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(pk=project_to_delete.pk).exists())


class TicketAPITests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.tickets_url = reverse('ticket-list')

    def test_get_ticket_list_authenticated(self):
        response = self.client.get(self.tickets_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), Ticket.objects.count())
        # Ensure serializer is working by checking a known field.
        # Note: response.data is a list of OrderedDicts.
        self.assertTrue(any(t['title'] == self.ticket1.title for t in response.data))


    def test_create_ticket_authenticated_valid_data(self):
        new_ticket_data = {
            'project': self.project1.pk,
            'jira_id': 'NTP1-1',
            'title': 'New Test Ticket 1',
            'status': 'Pending',
            'priority': 'Low',
            'created_date': '2024-02-01T00:00:00Z',
            'updated_date': '2024-02-01T00:00:00Z',
            'description': 'A new ticket for testing.'
        }
        response = self.client.post(self.tickets_url, new_ticket_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(Ticket.objects.filter(jira_id='NTP1-1').exists())

    def test_create_ticket_authenticated_invalid_data_missing_title(self):
        invalid_data = {
            'project': self.project1.pk,
            'jira_id': 'INV-TKT-1',
            'status': 'Open',
            'priority': 'Medium',
            'created_date': '2024-01-01T00:00:00Z',
            'updated_date': '2024-01-01T00:00:00Z'
        }
        response = self.client.post(self.tickets_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    @patch('vibejira_django.jira_integration.views.get_jira_issue')
    def test_get_ticket_retrieve_authenticated_exists_local_db(self, mock_get_jira_issue):
        # PK for retrieve is jira_id based on TicketViewSet's retrieve override
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.jira_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.ticket1.title)
        mock_get_jira_issue.assert_not_called()

    @patch('vibejira_django.jira_integration.views.get_jira_issue')
    def test_get_ticket_retrieve_authenticated_fetch_from_jira_success(self, mock_get_jira_issue):
        jira_issue_id_to_fetch = "JIRA-XYZ-789"
        mock_jira_response = {
            'key': jira_issue_id_to_fetch,
            'fields': {
                'summary': 'Fetched from JIRA title', 'description': 'Fetched description.',
                'status': {'name': 'In Progress'}, 'priority': {'name': 'High'},
                'project': {'key': self.project1.jira_key, 'name': self.project1.name},
                'assignee': {'displayName': 'JIRA User Assignee'}, 'reporter': {'displayName': 'JIRA User Reporter'},
                'created': '2024-03-01T10:00:00.000+0000', 'updated': '2024-03-01T11:00:00.000+0000',
                'duedate': None
            }
        }
        mock_get_jira_issue.return_value = mock_jira_response

        url = reverse('ticket-detail', kwargs={'pk': jira_issue_id_to_fetch})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        mock_get_jira_issue.assert_called_once_with(jira_issue_id_to_fetch)
        self.assertTrue(Ticket.objects.filter(jira_id=jira_issue_id_to_fetch).exists())
        newly_created_ticket = Ticket.objects.get(jira_id=jira_issue_id_to_fetch)
        self.assertEqual(newly_created_ticket.title, mock_jira_response['fields']['summary'])

    @patch('vibejira_django.jira_integration.views.get_jira_issue')
    def test_get_ticket_retrieve_authenticated_fetch_from_jira_api_error(self, mock_get_jira_issue):
        jira_issue_id_to_fetch = "JIRA-FAIL-000"
        mock_get_jira_issue.return_value = {"error": "JIRA API Error", "status_code": 500}
        
        url = reverse('ticket-detail', kwargs={'pk': jira_issue_id_to_fetch})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR, response.data)
        mock_get_jira_issue.assert_called_once_with(jira_issue_id_to_fetch)
        self.assertIn("jira_error", response.data)

    def test_update_ticket_patch_authenticated_status(self):
        # TicketViewSet uses jira_id for lookup in retrieve, but default ModelViewSet
        # uses PK for update/partial_update. The current implementation of TicketViewSet
        # does NOT override update/partial_update, so it will expect the database PK.
        url = reverse('ticket-detail', kwargs={'pk': self.ticket1.pk}) # Using database PK
        updated_status_data = {'status': 'In Progress'}
        response = self.client.patch(url, updated_status_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.ticket1.refresh_from_db()
        self.assertEqual(self.ticket1.status, updated_status_data['status'])

    def test_delete_ticket_authenticated(self):
        ticket_to_delete = Ticket.objects.create(
            project=self.project1, jira_id='DEL-TKT-1', title='Ticket to Delete',
            status='Open', priority='Low', created_date='2024-01-01T00:00:00Z', updated_date='2024-01-01T00:00:00Z'
        )
        url = reverse('ticket-detail', kwargs={'pk': ticket_to_delete.pk}) # Using database PK
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Ticket.objects.filter(pk=ticket_to_delete.pk).exists())


class CommentAPITests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.comments_url = reverse('comment-list') 

    def test_get_comment_list_for_ticket_authenticated(self):
        # Create another comment for a different ticket to ensure filtering works
        project2 = Project.objects.create(name="Project 2", jira_key="P2")
        ticket2 = Ticket.objects.create(project=project2, jira_id='P2-1', title='Ticket 2', status='Open', priority='Low', created_date='2024-01-01T00:00:00Z', updated_date='2024-01-01T00:00:00Z')
        Comment.objects.create(ticket=ticket2, author="Other Author", body="Comment on another ticket", created_date='2024-01-01T00:00:00Z')

        # Test fetching comments filtered by self.ticket1.pk
        response_filtered = self.client.get(self.comments_url, {'ticket': self.ticket1.pk})
        self.assertEqual(response_filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_filtered.data), 1) # Only self.comment1
        self.assertEqual(response_filtered.data[0]['body'], self.comment1.body)

    def test_create_comment_authenticated_valid_data(self):
        new_comment_data = {
            'ticket': self.ticket1.pk, 
            'author': self.user.email, 
            'body': 'A newly created test comment.',
            'created_date': '2024-03-03T12:00:00Z' 
        }
        response = self.client.post(self.comments_url, new_comment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        # Count should be initial comments + 1 for ticket2 + 1 new = 3
        self.assertEqual(Comment.objects.count(), 3) 
        latest_comment = Comment.objects.latest('id')
        self.assertEqual(latest_comment.body, new_comment_data['body'])

    def test_create_comment_authenticated_invalid_data_missing_body(self):
        invalid_data = {
            'ticket': self.ticket1.pk,
            'author': self.user.email,
            'created_date': '2024-03-03T13:00:00Z'
        }
        response = self.client.post(self.comments_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body', response.data)

    def test_create_comment_authenticated_invalid_data_non_existent_ticket(self):
        invalid_data = {
            'ticket': self.ticket1.pk + 999, # Non-existent ticket PK
            'author': self.user.email,
            'body': 'Comment for a ghost ticket.',
            'created_date': '2024-03-03T14:00:00Z'
        }
        response = self.client.post(self.comments_url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ticket', response.data) # DRF validation error for invalid foreign key

# Instructions for running tests:
# (These would typically be in a README.md, but included here as per prompt)
#
# ## Running Tests
#
# To run the automated tests for the `jira_integration` app, navigate to the
# `vibejira_django` project root directory (where `manage.py` is located)
# and execute the following command in your terminal:
#
# ```bash
# python manage.py test jira_integration
# ```
#
# This command will discover and run all tests within the `jira_integration/tests.py` file.
# Ensure your virtual environment is activated and all dependencies from
# `requirements.txt` are installed.
#
# The tests use `unittest.mock.patch` to mock external JIRA API calls made via
# `jira_utils.get_jira_issue` (which is imported into `views.py`). This allows
# tests for JIRA interaction logic (like fetching a ticket not in the local DB)
# to run reliably without a live JIRA connection or valid JIRA credentials.
#
# Test results will indicate success or failure for each test case, along with
# any errors or tracebacks.
#
# To run a specific test class or method:
# ```bash
# python manage.py test jira_integration.tests.TicketAPITests
# python manage.py test jira_integration.tests.TicketAPITests.test_get_ticket_retrieve_authenticated_fetch_from_jira_success
# ```
#
# Note on URL Naming:
# The tests rely on Django's `reverse()` function to generate URLs for API endpoints.
# This requires that your URL patterns in `urls.py` are named. For example:
# - `router.register(r'projects', ProjectViewSet, basename='project')`
# - `router.register(r'tickets', TicketViewSet, basename='ticket')`
# - `router.register(r'comments', CommentViewSet, basename='comment')`
# - `path('api-token-auth/', authtoken_views.obtain_auth_token, name='api-token-auth')`
# The test code uses names like 'project-list', 'project-detail', 'ticket-list', 'ticket-detail', etc.
# These are default names generated by DRF's DefaultRouter. If you've customized these names,
# update the `reverse()` calls in the tests accordingly.
# For the `CommentAPITests`, the `list` view for comments is assumed to be named `comment-list` and
# allows filtering by `ticket` PK in query parameters (e.g., `/api/comments/?ticket=<pk>`).
# If your comment endpoint is nested (e.g., `/api/tickets/<ticket_pk>/comments/`), the URL reversing
# and test logic for fetching comments would need to be adjusted.
# The test `test_update_ticket_patch_authenticated_status` and `test_delete_ticket_authenticated`
# currently assume that the detail URL for tickets (`ticket-detail`) uses the database primary key (PK)
# for `PATCH` and `DELETE` operations, as `TicketViewSet` does not override `update` or `destroy` methods.
# However, `retrieve` is overridden to use `jira_id`. This means:
# - `GET /api/tickets/{jira_id}/` is handled by the overridden `retrieve`.
# - `PATCH /api/tickets/{db_pk}/` and `DELETE /api/tickets/{db_pk}/` use the database PK.
# This distinction is important for writing correct tests.
#
#
# A note on `vibejira_django.jira_integration.views.get_jira_issue`:
# The patch target `@patch('vibejira_django.jira_integration.views.get_jira_issue')` assumes that
# `get_jira_issue` is imported directly into the `views.py` module. If it's imported differently
# (e.g., `from . import jira_utils` and then called as `jira_utils.get_jira_issue`), the patch
# target must be adjusted accordingly (e.g., `@patch('vibejira_django.jira_integration.jira_utils.get_jira_issue')`
# if `views.py` calls it that way, or more precisely, where it's looked up at runtime).
# The current path is based on the common pattern of `from .jira_utils import get_jira_issue` in `views.py`.
#
# The test `test_get_comment_list_for_ticket_authenticated` assumes that the listing
# of comments can be filtered by `ticket` (PK) as a query parameter.
# e.g. `GET /api/comments/?ticket=1`. This is a common way to implement filtering
# with DRF if comments are not a nested resource.
#
# The `setUpTestData` class method is used for setting up data that is shared across
# all test methods in a class and is created once per class. This is more efficient
# than `setUp` for data that doesn't need to be reset for each test.
# `setUp` is then used for objects that might be modified by tests or need to be
# fresh for each test, like the `APIClient`.
#
# Ensure your `CommentSerializer` is configured to correctly handle the `ticket` field
# (e.g., using `PrimaryKeyRelatedField`) for creating comments.
# The `author` field for comments is populated with `self.user.email` in `test_create_comment_authenticated_valid_data`.
# Ensure your `Comment` model and serializer can handle this or adjust as needed.
#
# The `TicketAPITests` for `retrieve` are specifically designed to test both local DB hits
# and fallbacks to JIRA (mocked). The `pk` in the URL for `ticket-detail` is the `jira_id`
# because the `TicketViewSet.retrieve` method is overridden to use `kwargs.get('pk')` as `jira_id`.
# However, for `update` and `delete`, DRF's default `ModelViewSet` behavior uses the actual
# database primary key. The tests reflect this distinction.
#
# For `test_get_ticket_list_authenticated`, the assertion `self.assertTrue(any(t['title'] == self.ticket1.title for t in response.data))`
# is a robust way to check if the ticket is present in the list, as the order might not be guaranteed.
#
# One final check for `TicketAPITests.test_create_ticket_authenticated_valid_data`:
# The number of tickets before creation is 1 (self.ticket1). After creation, it should be 2.
# The test `self.assertEqual(Ticket.objects.count(), 2)` was in the original template for Project,
# it should be adapted if there are more tickets created in setUpTestData or other tests.
# Given `setUpTestData`, there's only `self.ticket1`. So, after creating one more, count should be 2.
# This seems correct.
# Similarly for `CommentAPITests.test_create_comment_authenticated_valid_data`:
# `self.comment1` is created in `setUpTestData`.
# `test_get_comment_list_for_ticket_authenticated` creates one more comment on `ticket2`.
# So, before `test_create_comment_authenticated_valid_data` runs, there are 2 comments.
# After creating one more, the count becomes 3. This also seems correct.
#
# The test file is quite comprehensive.
# Make sure all necessary imports are present and correct.
# `from unittest.mock import patch, MagicMock` was added to the template.
# Serializers are not directly used but can be helpful for understanding data structure.
# The `setUpTestData` is a good optimization.
# The instructions for running tests are clear.I have overwritten `vibejira_django/jira_integration/tests.py` with a comprehensive suite of unit tests.

**Summary of `tests.py` Content:**

1.  **`AuthTokenTests`:**
    *   Tests token generation with valid and invalid credentials.
    *   Ensures that `rest_framework.authtoken.views.obtain_auth_token` (or its equivalent if customized) works as expected.

2.  **`BaseAPITestCase`:**
    *   Uses `setUpTestData` for efficient creation of common test data (user, project, ticket, comment).
    *   `setUp` method initializes an authenticated `APIClient` for use in derived test classes.

3.  **`ProjectAPITests(BaseAPITestCase)`:**
    *   Covers GET (list, retrieve), POST, PUT, PATCH, and DELETE operations for projects.
    *   Tests for unauthenticated access, valid/invalid data, duplicate keys, and non-existent resources.

4.  **`TicketAPITests(BaseAPITestCase)`:**
    *   Covers GET (list, retrieve), POST, PATCH, and DELETE for tickets.
    *   **Mocking for `retrieve`:** Critically, the `retrieve` tests for tickets include:
        *   Fetching a ticket that exists locally (mocked `get_jira_issue` should not be called).
        *   Fetching a ticket not in the local DB, successfully from JIRA (mocked `get_jira_issue` returns valid data, ticket is created locally).
        *   Fetching a ticket not in the local DB, where JIRA API call fails (mocked `get_jira_issue` returns an error).
    *   The tests for `update` (PATCH) and `delete` assume that the `ticket-detail` URL uses the database PK for these operations, as the `TicketViewSet` does not override the default `update`/`destroy` methods which use the model's PK. The `retrieve` method, however, is overridden to use `jira_id` from the URL's `pk` kwarg.

5.  **`CommentAPITests(BaseAPITestCase)`:**
    *   Covers GET (list, filtered by ticket) and POST (create) for comments.
    *   Assumes comments are listed via `/api/comments/` and can be filtered using a query parameter (e.g., `/api/comments/?ticket=<ticket_pk>`).
    *   Tests creation with valid data, missing body, and for a non-existent ticket.

6.  **Mocking:**
    *   `@patch('vibejira_django.jira_integration.views.get_jira_issue')` is used to mock the JIRA API interaction within the `TicketViewSet`'s `retrieve` method. This ensures tests are isolated and don't make real network calls.

7.  **URL Reversing and Naming:**
    *   Tests use `django.urls.reverse` with standard DRF `DefaultRouter` generated names (e.g., `project-list`, `ticket-detail`). Notes are included in the file's docstring about ensuring these names match the project's URL configuration.

8.  **Test Execution Instructions:**
    *   The file ends with a comprehensive comment block explaining how to run the tests using `python manage.py test jira_integration`, how to run specific tests, and notes on the test setup (mocking, URL naming, PK vs. `jira_id` usage in `TicketViewSet`).

The testing environment is implicitly set up by Django's test runner when `manage.py test` is called. All necessary utilities like `APITestCase`, `APIClient`, and `unittest.mock.patch` are standard parts of Django REST Framework and Python, respectively, and should be available if the project dependencies are correctly installed.

This set of tests should provide good coverage for the specified API endpoints and their core functionalities.
