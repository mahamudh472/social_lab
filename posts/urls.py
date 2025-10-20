from django.urls import path
from . import views

app_name = 'posts'
urlpatterns = [
    path('', views.PostListView.as_view(), name='post_list'),
    path('create/', views.PostCreateView.as_view(), name='post_create'),
    path('<int:pk>/', views.PostDetailView.as_view(), name='post_detail'),
    path('<int:pk>/like/', views.LikeToggleView.as_view(), name='like_toggle'),
    path('<int:pk>/comment/', views.CommentCreateView.as_view(), name='comment_create'),
    path('<int:pk>/share/', views.PostShareView.as_view(), name='post_share'),
]
