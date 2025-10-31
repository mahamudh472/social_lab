from django.urls import path
from .import views
urlpatterns = [
    path('', views.ConversationAPIView.as_view(), name="conversations"),
    path('<int:conversation_id>/', views.ConversationDetailsAPIView.as_view(), name="conversation"),
    path('<int:conversation_id>/messages/', views.MessageListCreateAPIView.as_view(), name="messages"),
    path('<int:conversation_id>/messages/upload/', views.FileUploadAPIView.as_view(), name="message_file_upload"),
    path('<int:conversation_id>/messages/<int:message_id>/delete/', views.DeleteMessageAPIView.as_view(), name="message_delete"),
]