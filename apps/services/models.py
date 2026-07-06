"""服务套餐模型。"""
import secrets

from django.db import models
from django.utils import timezone


def generate_service_id():
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"SRV{ts}{secrets.token_hex(2).upper()}"


class Service(models.Model):
    """服务套餐(私教/定制等增值服务)。"""

    class Status(models.TextChoices):
        ACTIVE = "active", "上架"
        INACTIVE = "inactive", "下架"

    service_id = models.CharField(
        "服务编号", max_length=32, unique=True, default=generate_service_id
    )
    name = models.CharField("服务名称", max_length=120)
    desc = models.TextField("服务描述", blank=True)
    icon = models.URLField("图标", blank=True)
    price = models.DecimalField("价格(元)", max_digits=10, decimal_places=2, default=0)
    original_price = models.DecimalField(
        "划线价(元)", max_digits=10, decimal_places=2, null=True, blank=True
    )
    points_cost = models.PositiveIntegerField("积分价格", default=0)
    features = models.CharField(
        "服务特性", max_length=300, blank=True, help_text="逗号分隔"
    )
    sort_order = models.IntegerField("排序权重", default=50)
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "服务套餐"
        verbose_name_plural = verbose_name
        ordering = ["-sort_order", "id"]

    def __str__(self):
        return self.name

    @property
    def feature_list(self):
        return [f.strip() for f in self.features.split(",") if f.strip()]
