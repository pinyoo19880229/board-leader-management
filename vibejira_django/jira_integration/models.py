from django.db import models

class Project(models.Model):
    name = models.CharField(max_length=255)
    jira_key = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Ticket(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    jira_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=100)
    priority = models.CharField(max_length=100)
    assignee = models.CharField(max_length=255, blank=True, null=True)
    reporter = models.CharField(max_length=255, blank=True, null=True)
    created_date = models.DateTimeField()
    updated_date = models.DateTimeField()
    due_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.title

from django.conf import settings # For AUTH_USER_MODEL

class Comment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='jira_comments')
    body = models.TextField()
    created_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username if self.author else 'Unknown author'} on {self.ticket.title}"
