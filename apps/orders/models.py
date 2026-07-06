"""报单(咨询订单)模型。"""
import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone


def generate_order_id():
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"ORD{ts}{secrets.token_hex(2).upper()}"


class Order(models.Model):
    """报单记录:用户提交,管理员/咨询师审核。"""

    class Type(models.TextChoices):
        COURSE_CONSULTING = "course_consulting", "课程咨询"
        PRIVATE_TRAINING = "private_training", "私教指导"
        EVENT_SIGNUP = "event_signup", "活动报名"
        EQUIPMENT = "equipment", "器械定制"
        OTHER = "other", "其他"

    class Status(models.TextChoices):
        PENDING = "pending", "待审核"
        APPROVED = "approved", "已通过"
        REJECTED = "rejected", "已拒绝"
        CANCELLED = "cancelled", "已取消"

    order_id = models.CharField(
        "订单号", max_length=32, unique=True, default=generate_order_id
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="提交用户",
        on_delete=models.CASCADE,
        related_name="orders",
    )
    type = models.CharField(
        "报单类型", max_length=30, choices=Type.choices, default=Type.OTHER
    )
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.PENDING
    )
    contact_name = models.CharField("联系人", max_length=64)
    phone = models.CharField("联系电话", max_length=20)
    description = models.TextField("需求描述")
    amount = models.DecimalField(
        "金额(元)", max_digits=10, decimal_places=2, null=True, blank=True
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="审核人",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_orders",
    )
    review_note = models.CharField("审核备注", max_length=300, blank=True)
    reviewed_at = models.DateTimeField("审核时间", null=True, blank=True)
    created_at = models.DateTimeField("提交时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "报单"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_id
