from django.urls import path
from .import views
urlpatterns = [
    path('', views.ConversationAPIView.as_view(), name="conversations"),
    path('<int:conversation_id>/', views.ConversationDetailsAPIView.as_view(), name="conversation"),
    path('<int:conversation_id>/messages/', views.MessageListCreateAPIView.as_view(), name="messages"),
    
]