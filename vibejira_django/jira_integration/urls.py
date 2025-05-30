from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TicketViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'tickets', TicketViewSet)
router.register(r'comments', CommentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
