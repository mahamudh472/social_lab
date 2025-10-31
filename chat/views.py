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
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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

class FileUploadAPIView(CreateAPIView):
    permission_classes = [IsAuthenticated, IsConversationParticipant]
    serializer_class = MessageSerializer

    def post(self, request, *args, **kwargs):
        conv_id = self.kwargs.get('conversation_id', None)
        file = request.FILES.get('file', None)
        text = request.data.get('text', '')
        if not file:
            return Response({"file": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        
        message = Message.objects.create(
            conversation=Conversation.objects.get(id=conv_id),
            sender=request.user,
            file=file,
            text=text
        )
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{conv_id}',
            {
                'type': 'chat_message',
                'id': message.id,
                'message': message.text,
                'file': message.file.url if message.file else None,
                'sender': message.sender.username,
                'timestamp': str(message.created_at),
            }
        )

        serializer = self.get_serializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class DeleteMessageAPIView(APIView):
    permission_classes = [IsAuthenticated, IsConversationParticipant]

    def delete(self, request, conversation_id, message_id, *args, **kwargs):
        try:
            message = Message.objects.get(id=message_id, conversation__id=conversation_id)
            message.deleted = True
            message.save()
            return Response({"success": "Message deleted."}, status=status.HTTP_200_OK)
        except Message.DoesNotExist:
            return Response({"error": "Message not found."}, status=status.HTTP_404_NOT_FOUND)