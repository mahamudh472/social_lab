from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.SelfProfileAPIView.as_view(), name="selfprofile"),
    path('update/', views.UpdateProfileAPIView.as_view(), name="updateprofile"),
    path('<int:pk>/', views.UserProfileAPIView.as_view(), name="userprofile"),
    path('<int:pk>/follow/', views.FollowAPIView.as_view(), name="follow"),
    path('<int:pk>/followers/', views.FollowerAPIView.as_view(), name="followers"),
    path('<int:pk>/following/', views.FollowingAPIView.as_view(), name="following"),
    path('search/', views.SearchUsersAPIView.as_view(), name="search_users"),

]

    