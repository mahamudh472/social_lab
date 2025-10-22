from rest_framework import serializers
from .models import Post, Comment


class PostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    profile_image = serializers.ImageField(source='user.profile_image', read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ['id', 'image', 'caption', 'shared_from', 'created_at', 
                  'username', 'profile_image', 'likes_count', 'comments_count', 'liked']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_likes_count(self, obj):
        return obj.likes.count()
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'text']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'post': {'write_only': True},
            'author': {'write_only': True},
        }

