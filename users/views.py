from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response

from users.models import User
from .serializers import RegisterSerializer, UserSerializer
from rest_framework import status, permissions, generics

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
        


class UserProfileAPIView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

class FollowAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, user_id):
        pass

class FollowerAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

class FollowingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    


