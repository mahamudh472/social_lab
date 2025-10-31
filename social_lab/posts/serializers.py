from rest_framework import serializers
from .models import Post, Comment


class PostSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    profile_image = serializers.ImageField(source='user.profile_image', read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ['id', 'user_id', 'image', 'caption', 'shared_from', 'created_at', 
                  'username', 'profile_image', 'likes_count', 'comments_count', 'liked', 'is_following']
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
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check if current user is following the post author
            if obj.user == request.user:
                return None  # It's the user's own post
            return request.user.following.filter(pk=obj.user.pk).exists()
        return False
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Return relative URLs (e.g. /media/...) instead of absolute ones
        if instance.image and getattr(instance.image, 'url', None):
            representation['image'] = instance.image.url
        else:
            representation['image'] = None

        if instance.user and getattr(instance.user, 'profile_image', None) and getattr(instance.user.profile_image, 'url', None):
            representation['profile_image'] = instance.user.profile_image.url
        else:
            representation['profile_image'] = None

        return representation


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'text']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'post': {'write_only': True},
            'author': {'write_only': True},
        }

