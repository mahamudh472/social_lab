from rest_framework import permissions
from .models import Conversation

class IsConversationParticipant(permissions.BasePermission):
    message = "You are not participant in this conversation."

    def has_permission(self, request, view):
        conv_id = view.kwargs.get("conversation_id")
        if not conv_id:
            return False
        
        return Conversation.objects.filter(
            id=conv_id,
            participants=request.user        
        ).exists()