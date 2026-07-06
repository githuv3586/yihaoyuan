"""管理后台路由。"""
from django.urls import path

from . import views

app_name = "panel"

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("", views.dashboard, name="dashboard"),
    # 用户管理
    path("users/", views.user_list, name="user_list"),
    path("users/<int:pk>/", views.user_detail, name="user_detail"),
    path("users/<int:pk>/edit/", views.user_edit, name="user_edit"),
    path("users/<int:pk>/vip/", views.user_set_vip, name="user_set_vip"),
    # 积分管理
    path("points/grant/", views.points_grant, name="points_grant"),
    path("points/ledger/", views.ledger_list, name="ledger_list"),
    path("points/exchanges/", views.exchange_list, name="exchange_list"),
    path("points/exchanges/<int:pk>/process/", views.exchange_process, name="exchange_process"),
    # 报单管理
    path("orders/", views.order_list, name="order_list"),
    path("orders/<int:pk>/", views.order_detail, name="order_detail"),
    path("orders/<int:pk>/review/", views.order_review, name="order_review"),
    # 课程管理
    path("courses/", views.course_list, name="course_list"),
    path("courses/new/", views.course_edit, name="course_create"),
    path("courses/<int:pk>/edit/", views.course_edit, name="course_edit"),
    path("courses/<int:pk>/toggle/", views.course_toggle, name="course_toggle"),
    path("courses/<int:pk>/chapters/", views.chapter_list, name="chapter_list"),
    path("chapters/<int:pk>/delete/", views.chapter_delete, name="chapter_delete"),
    # 服务管理
    path("services/", views.service_list, name="service_list"),
    path("services/new/", views.service_edit, name="service_create"),
    path("services/<int:pk>/edit/", views.service_edit, name="service_edit"),
    # 内容管理
    path("articles/", views.article_list, name="article_list"),
    path("articles/new/", views.article_edit, name="article_create"),
    path("articles/<int:pk>/edit/", views.article_edit, name="article_edit"),
    path("videos/", views.video_list, name="video_list"),
    path("videos/new/", views.video_edit, name="video_create"),
    path("videos/<int:pk>/edit/", views.video_edit, name="video_edit"),
    # 消息管理
    path("messages/", views.message_list, name="message_list"),
    path("messages/send/", views.message_send, name="message_send"),
    # 兑换目录
    path("catalog/", views.catalog_list, name="catalog_list"),
    path("catalog/new/", views.catalog_edit, name="catalog_create"),
    path("catalog/<int:pk>/edit/", views.catalog_edit, name="catalog_edit"),
    # VIP 管理
    path("vips/", views.vip_list, name="vip_list"),
    # 操作日志
    path("logs/", views.log_list, name="log_list"),
]
