"""H5 移动端路由。"""
from django.urls import path

from . import views

app_name = "h5"

urlpatterns = [
    path("", views.home, name="home"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("api/send-code/", views.send_code, name="send_code"),
    path("videos/<int:pk>/like/", views.like_video, name="like_video"),
    path("courses/", views.course_list, name="course_list"),
    path("courses/<str:course_id>/", views.course_detail, name="course_detail"),
    path("courses/<str:course_id>/enroll/", views.enroll_course, name="enroll_course"),
    path("my/enrollments/", views.my_enrollments, name="my_enrollments"),
    path("articles/", views.article_list, name="article_list"),
    path("articles/<int:pk>/", views.article_detail, name="article_detail"),
    path("articles/<int:pk>/like/", views.like_article, name="like_article"),
    path("orders/", views.order_list, name="order_list"),
    path("orders/new/", views.order_create, name="order_create"),
    path("points/", views.points_home, name="points"),
    path("points/exchange/<int:pk>/", views.exchange_item, name="exchange_item"),
    path("messages/", views.message_list, name="message_list"),
    path("messages/<int:pk>/read/", views.message_read, name="message_read"),
    path("profile/", views.profile, name="profile"),
]
