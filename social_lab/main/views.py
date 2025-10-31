from rest_framework import generics, permissions, pagination
from users.models import User
from posts.models import Post
from posts.serializers import PostSerializer
from users.serializers import UserSerializer
from rest_framework.response import Response
from django.db.models import Q

class SearchAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = None  # No serializer needed for this view
    pagination_class = pagination.PageNumberPagination
    pagination_class.page_size = 10

    def get(self, request):
        query = request.query_params.get('q', '')

        # Search users by username or full name
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        )

        # Search posts by caption
        posts = Post.objects.filter(caption__icontains=query)

        user_serializer = UserSerializer(users, many=True)
        post_serializer = PostSerializer(posts, many=True, context={'request': request})

        return Response({
            'users': user_serializer.data,
            'posts': post_serializer.data
        })