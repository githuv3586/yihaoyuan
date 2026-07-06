"""消息通知模型。"""
from django.conf import settings
from django.db import models


class Message(models.Model):
    """站内消息通知。"""

    class Type(models.TextChoices):
        SYSTEM = "system", "系统通知"
        ORDER = "order", "报单通知"
        COURSE = "course", "课程通知"
        POINTS = "points", "积分通知"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="接收用户",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    type = models.CharField(
        "类型", max_length=10, choices=Type.choices, default=Type.SYSTEM
    )
    title = models.CharField("标题", max_length=120)
    content = models.TextField("内容", blank=True)
    link = models.CharField("跳转链接", max_length=200, blank=True)
    is_read = models.BooleanField("已读", default=False)
    created_at = models.DateTimeField("发送时间", auto_now_add=True)

    class Meta:
        verbose_name = "消息通知"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.title}"


def notify(user, title, content="", msg_type=Message.Type.SYSTEM, link=""):
    """向单个用户发送站内消息。"""
    return Message.objects.create(
        user=user, title=title, content=content, type=msg_type, link=link
    )
