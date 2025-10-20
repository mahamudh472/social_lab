from rest_framework import serializers
from .models import Post, Comment


class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['id', 'caption', 'created_at', ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'text']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'post': {'write_only': True},
            'author': {'write_only': True},
        }
