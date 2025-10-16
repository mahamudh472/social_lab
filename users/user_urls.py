from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.SelfProfileAPIView.as_view(), name="selfprofile"),
    path('<int:pk>/', views.UserProfileAPIView.as_view(), name="userprofile"),
    path('<int:pk>/follow/', views.FollowAPIView.as_view(), name="follow"),
    path('<int:pk>/followers/', views.FollowerAPIView.as_view(), name="followers"),
    path('<int:pk>/following/', views.FollowingAPIView.as_view(), name="following"),
]

    