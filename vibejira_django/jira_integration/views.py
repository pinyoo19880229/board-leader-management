from rest_framework import viewsets
from .models import Project, Ticket, Comment
from .serializers import ProjectSerializer, TicketSerializer, CommentSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer

    def retrieve(self, request, *args, **kwargs):
        jira_id = kwargs.get('pk') # Assuming 'pk' is the jira_id for retrieve
        try:
            # Try to fetch from local database first
            ticket = Ticket.objects.get(jira_id=jira_id)
            serializer = self.get_serializer(ticket)
            return Response(serializer.data)
        except Ticket.DoesNotExist:
            # If not found locally, fetch from JIRA
            from .jira_utils import get_jira_issue
            jira_data = get_jira_issue(jira_id)

            if jira_data and not jira_data.get("error"):
                # Ensure project exists or create a placeholder if necessary
                # This part might need more robust handling in a real app
                project_key = jira_data.get('fields', {}).get('project', {}).get('key')
                project_name = jira_data.get('fields', {}).get('project', {}).get('name')
                
                if not project_key:
                    return Response({"error": "Project key not found in JIRA data"}, status=status.HTTP_400_BAD_REQUEST)

                project, _ = Project.objects.get_or_create(
                    jira_key=project_key, 
                    defaults={'name': project_name or 'Unnamed Project'}
                )

                # Map JIRA data to Ticket model fields
                ticket_data = {
                    'project': project,
                    'jira_id': jira_data.get('key'),
                    'title': jira_data.get('fields', {}).get('summary'),
                    'description': jira_data.get('fields', {}).get('description'),
                    'status': jira_data.get('fields', {}).get('status', {}).get('name'),
                    'priority': jira_data.get('fields', {}).get('priority', {}).get('name'),
                    'assignee': jira_data.get('fields', {}).get('assignee', {}).get('displayName') if jira_data.get('fields', {}).get('assignee') else None,
                    'reporter': jira_data.get('fields', {}).get('reporter', {}).get('displayName') if jira_data.get('fields', {}).get('reporter') else None,
                    'created_date': jira_data.get('fields', {}).get('created'),
                    'updated_date': jira_data.get('fields', {}).get('updated'),
                    'due_date': jira_data.get('fields', {}).get('duedate'),
                }
                
                # Remove None values for fields that don't allow null if not blank
                ticket_data_cleaned = {k: v for k, v in ticket_data.items() if v is not None}


                # Create or update local ticket instance
                # Using update_or_create to handle both cases
                ticket, created = Ticket.objects.update_or_create(
                    jira_id=jira_id,
                    defaults=ticket_data_cleaned
                )
                
                serializer = self.get_serializer(ticket)
                return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            else:
                error_detail = {"error": "Failed to fetch ticket from JIRA."}
                if jira_data and jira_data.get("error"):
                    error_detail["jira_error"] = jira_data.get("error")
                    if "status_code" in jira_data:
                         return Response(error_detail, status=jira_data.get("status_code", 500)) # Use JIRA's status code if available
                return Response(error_detail, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # General exception handler
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def perform_create(self, serializer):
        # Automatically set the author to the currently authenticated user
        serializer.save(author=self.request.user)
