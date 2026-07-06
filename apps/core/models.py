"""系统级模型:管理操作日志。"""
from django.conf import settings
from django.db import models


class AdminLog(models.Model):
    """管理操作审计日志,所有后台写操作自动记录。"""

    class Module(models.TextChoices):
        USERS = "users", "用户管理"
        POINTS = "points", "积分管理"
        ORDERS = "orders", "报单管理"
        COURSES = "courses", "课程管理"
        SERVICES = "services", "服务管理"
        MESSAGES = "messages", "消息管理"
        CONTENT = "content", "内容管理"
        VIP = "vip", "VIP 管理"
        SYSTEM = "system", "系统设置"

    class Action(models.TextChoices):
        CREATE = "create", "创建"
        UPDATE = "update", "更新"
        DELETE = "delete", "删除"
        APPROVE = "approve", "通过"
        REJECT = "reject", "拒绝"
        GRANT = "grant", "发放"
        REVOKE = "revoke", "撤销"

    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="操作者",
        null=True,
        on_delete=models.SET_NULL,
        related_name="admin_logs",
    )
    operator_name = models.CharField("操作者名称", max_length=64, blank=True)
    module = models.CharField("模块", max_length=20, choices=Module.choices)
    action = models.CharField("操作", max_length=20, choices=Action.choices)
    target_type = models.CharField("目标类型", max_length=64, blank=True)
    target_id = models.CharField("目标 ID", max_length=64, blank=True)
    detail = models.TextField("操作详情", blank=True)
    ip = models.GenericIPAddressField("操作者 IP", null=True, blank=True)
    created_at = models.DateTimeField("操作时间", auto_now_add=True)

    class Meta:
        verbose_name = "操作日志"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.operator_name} {self.get_module_display()}/{self.get_action_display()}"


def log_admin_action(request, module, action, target_type="", target_id="", detail=""):
    """记录一条管理操作日志。"""
    return AdminLog.objects.create(
        operator=request.user if request.user.is_authenticated else None,
        operator_name=getattr(request.user, "display_name", "") or "",
        module=module,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        detail=detail,
        ip=request.META.get("REMOTE_ADDR"),
    )
