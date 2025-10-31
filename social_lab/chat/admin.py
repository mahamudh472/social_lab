from django.contrib import admin
from .models import Conversation, Message
from unfold.admin import ModelAdmin
# Register your models here.

@admin.register(Conversation)
class ConversationAdmin(ModelAdmin):
    list_display = ('id', 'created_at')
    search_fields = ('id',)

@admin.register(Message)
class MessageAdmin(ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'text', 'created_at')
    search_fields = ('text', 'sender__username', 'conversation__id')