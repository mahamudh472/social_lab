from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.generics import (
    ListCreateAPIView,
    CreateAPIView,
    RetrieveAPIView
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import (
    ConversationSerializer, 
    ConversationDetailsSerializer,
    MessageSerializer
)
from .models import Conversation, Message
from rest_framework import status, response
from users.models import User
from .permissions import IsConversationParticipant

class ConversationAPIView(ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(participants=user)
    
    def create(self, request, *args, **kwargs):
        user = request.user
        participant_id = request.data.get("participant_id")
        if user.id == participant_id:
            return response.Response({"user": "User and participants are same."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not User.objects.filter(pk=participant_id).exists():
            return response.Response({"user": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        

        conv = (
            Conversation.objects
            .filter(participants=user)
            .filter(participants__id=participant_id)
            .filter(is_group=False)
            .distinct()
            .first()
        )   
        created = False
        if not conv:
            conv = Conversation.objects.create()
            conv.participants.add(user, User.objects.get(pk=participant_id))
            created = True
        status_code = status.HTTP_200_OK if not created else status.HTTP_201_CREATED
        

        return Response({"id": conv.id}, status=status_code)

class ConversationDetailsAPIView(RetrieveAPIView):
    serializer_class = ConversationDetailsSerializer
    permission_classes = [IsAuthenticated, IsConversationParticipant]
    queryset = Conversation.objects.all()
    lookup_url_kwarg = "conversation_id"

class MessageListCreateAPIView(ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsConversationParticipant]
    queryset = Message.objects.none()

    def get_queryset(self):
        conv_id = self.kwargs.get('conversation_id', None)
        if conv_id:
            return Message.objects.filter(conversation__id=conv_id)
        return Message.objects.none()
    
    def perform_create(self, serializer):
        conv_id = self.kwargs.get('conversation_id', None)
        serializer.save(
            conversation = Conversation.objects.get(id=conv_id),
            sender=self.request.user
        )
