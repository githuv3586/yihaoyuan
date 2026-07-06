"""积分流水、兑换目录与兑换记录模型。"""
import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone


def generate_ledger_id():
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"PLG{ts}{secrets.token_hex(2).upper()}"


def generate_exchange_id():
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"EXC{ts}{secrets.token_hex(2).upper()}"


class PointLedger(models.Model):
    """积分流水:每一笔积分变动都必须落流水。"""

    class Type(models.TextChoices):
        GRANT = "grant", "管理员发放"
        ADJUSTMENT = "adjustment", "管理调整"
        COURSE_ENROLL = "course_enroll", "课程报名"
        VIP_EXCHANGE = "vip_exchange", "VIP 兑换"
        EXCHANGE = "exchange", "商品兑换"
        REGISTER = "register", "注册奖励"
        INVITE = "invite", "邀请奖励"

    ledger_id = models.CharField(
        "流水号", max_length=32, unique=True, default=generate_ledger_id
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="用户",
        on_delete=models.CASCADE,
        related_name="point_ledgers",
    )
    type = models.CharField("类型", max_length=20, choices=Type.choices)
    change = models.IntegerField("变动值", help_text="正数增加,负数扣减")
    title = models.CharField("摘要", max_length=200)
    balance_after = models.IntegerField("变动后余额")
    ref_id = models.CharField("关联业务 ID", max_length=64, blank=True)
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="操作者",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="operated_ledgers",
    )
    created_at = models.DateTimeField("发生时间", auto_now_add=True)

    class Meta:
        verbose_name = "积分流水"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ledger_id} {self.change:+d}"


class ExchangeItem(models.Model):
    """积分兑换商品目录。"""

    class Status(models.TextChoices):
        ACTIVE = "active", "上架"
        INACTIVE = "inactive", "下架"

    title = models.CharField("商品名称", max_length=120)
    desc = models.CharField("商品描述", max_length=300, blank=True)
    points_cost = models.PositiveIntegerField("所需积分")
    is_vip = models.BooleanField("是否 VIP 商品", default=False)
    vip_days = models.PositiveIntegerField("VIP 天数", default=0)
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    sort_order = models.IntegerField("排序权重", default=50)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        verbose_name = "兑换商品"
        verbose_name_plural = verbose_name
        ordering = ["-sort_order", "id"]

    def __str__(self):
        return self.title


class PointExchange(models.Model):
    """积分兑换记录。"""

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "已提交"
        PROCESSED = "processed", "已处理"
        CANCELLED = "cancelled", "已取消"

    exchange_id = models.CharField(
        "兑换单号", max_length=32, unique=True, default=generate_exchange_id
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="用户",
        on_delete=models.CASCADE,
        related_name="point_exchanges",
    )
    item = models.ForeignKey(
        ExchangeItem,
        verbose_name="兑换商品",
        null=True,
        on_delete=models.SET_NULL,
        related_name="exchanges",
    )
    item_title = models.CharField("商品名称快照", max_length=120)
    points_cost = models.PositiveIntegerField("消耗积分")
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.SUBMITTED
    )
    created_at = models.DateTimeField("兑换时间", auto_now_add=True)
    processed_at = models.DateTimeField("处理时间", null=True, blank=True)

    class Meta:
        verbose_name = "兑换记录"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.exchange_id
