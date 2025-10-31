from rest_framework import serializers, exceptions
from .models import Conversation, Message
from users.models import User
from django.db.models import Count

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = ['conversation', "sender"]


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = '__all__'


class ConversationDetailsSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True)
    class Meta:
        model = Conversation
        fields = "__all__"
