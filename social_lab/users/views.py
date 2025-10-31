from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response

from users.models import User
from .serializers import RegisterSerializer, UserSerializer
from rest_framework import status, permissions, generics
from django.db.models import Q
class RegisterAPIView(APIView):
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'success': f"User {user.username} created successfuly"}, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    pass 

class SelfProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)


class UpdateProfileAPIView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserProfileAPIView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

class FollowAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            user_to_follow = User.objects.get(pk=pk)
            
            # Can't follow yourself
            if user_to_follow == request.user:
                return Response(
                    {'error': 'You cannot follow yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already following
            if request.user.following.filter(pk=user_to_follow.pk).exists():
                # Unfollow
                request.user.following.remove(user_to_follow)
                return Response({
                    'status': 'unfollowed',
                    'message': f'You unfollowed {user_to_follow.username}'
                }, status=status.HTTP_200_OK)
            else:
                # Follow
                request.user.following.add(user_to_follow)
                return Response({
                    'status': 'followed',
                    'message': f'You are now following {user_to_follow.username}'
                }, status=status.HTTP_200_OK)
                
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class FollowerAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            followers = user.followers.all()
            serializer = UserSerializer(followers, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class FollowingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            following = user.following.all()
            serializer = UserSerializer(following, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class SearchUsersAPIView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', None)
        if query:
            return User.objects.filter(
                Q(username__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query)
            )
        return User.objects.none()

