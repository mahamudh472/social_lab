from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Post, Comment
from .serializers import PostSerializer, CommentSerializer
from rest_framework.permissions import IsAuthenticated

class PostListView(generics.ListAPIView):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer

class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class PostDetailView(generics.RetrieveAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
class LikeToggleView(APIView):
    def post(self, request, pk):
        post = generics.get_object_or_404(Post, pk=pk)
        user = request.user
        if user in post.likes.all():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
        return Response({'liked': liked, 'total_likes': post.likes.count()}, status=status.HTTP_200_OK)
class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    def perform_create(self, serializer):
        post_pk = self.kwargs.get('pk')
        post = generics.get_object_or_404(Post, pk=post_pk)
        serializer.save(post=post, author=self.request.user)
class PostShareView(APIView):
    def post(self, request, pk):
        post = generics.get_object_or_404(Post, pk=pk)
        # Logic to share the post (e.g., send email, generate shareable link, etc.)
        # For simplicity, we'll just return a success message here.
        return Response({'message': 'Post shared successfully!'}, status=status.HTTP_200_OK)
    
