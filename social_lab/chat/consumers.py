# chat/consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async
from .models import Message, Conversation
from users.models import User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        # Authenticate the user (via JWT/session)
        user = self.scope['user']
        if user.is_anonymous:
            await self.close()
            return

        # Join group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        user = self.scope['user']

        saved_message = await self.save_message(user, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': saved_message['text'],  # Fixed: use 'text' not 'content'
                'sender': saved_message['sender'],
                'timestamp': saved_message['timestamp'],
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_message(self, user, text):
        conversation = Conversation.objects.get(id=self.conversation_id)
        msg = Message.objects.create(conversation=conversation, sender=user, text=text)
        return {
            'id': msg.id,
            'text': msg.text,  # Keep as 'text' for frontend
            'message': msg.text,  # Add this for compatibility
            'file': msg.file.url if msg.file else None,
            'sender': msg.sender.username,
            'timestamp': str(msg.created_at)
        }