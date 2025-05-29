from rest_framework import serializers
from .models import Project, Ticket, Comment

from django.contrib.auth import get_user_model

User = get_user_model()

class CommentSerializer(serializers.ModelSerializer):
    # author will be set in the view, so make it read-only here or use CurrentUserDefault
    author = serializers.ReadOnlyField(source='author.username') 
    # Alternatively, to show more author details (if UserSerializer exists):
    # author = UserSerializer(read_only=True) 
    created_date = serializers.ReadOnlyField()
    ticket = serializers.PrimaryKeyRelatedField(queryset=Ticket.objects.all())


    class Meta:
        model = Comment
        fields = ['id', 'ticket', 'author', 'body', 'created_date']
        # If you want to allow author to be set via serializer using CurrentUserDefault:
        # read_only_fields = ['created_date'] 
        # extra_kwargs = {'author': {'default': serializers.CurrentUserDefault()}}


class TicketSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())

    class Meta:
        model = Ticket
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    tickets = TicketSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = '__all__'
