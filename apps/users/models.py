"""武学修习者(用户)模型。"""
import secrets
import string
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


def generate_invite_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class UserManager(BaseUserManager):
    """以手机号为主要凭证的用户管理器。"""

    use_in_migrations = True

    def _create_user(self, phone, password, **extra_fields):
        if not phone:
            raise ValueError("必须提供手机号")
        user = self.model(phone=phone, username=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone, password, **extra_fields)

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPER_ADMIN)
        return self._create_user(phone, password, **extra_fields)


class User(AbstractUser):
    """武学修习者主表。"""

    class Role(models.TextChoices):
        CLIENT = "client", "普通学员"
        MEMBER = "member", "会员"
        CONSULTANT = "consultant", "咨询师"
        ADMIN = "admin", "运营管理员"
        SUPER_ADMIN = "super_admin", "超级管理员"

    class Status(models.TextChoices):
        ACTIVE = "active", "正常"
        BANNED = "banned", "已禁用"

    phone = models.CharField("手机号", max_length=20, unique=True)
    nickname = models.CharField("昵称", max_length=64, blank=True)
    avatar = models.URLField("头像", blank=True)
    role = models.CharField(
        "角色", max_length=20, choices=Role.choices, default=Role.CLIENT
    )
    status = models.CharField(
        "账号状态", max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    points = models.IntegerField("积分余额", default=0)
    total_points = models.IntegerField("历史总获得积分", default=0)
    used_points = models.IntegerField("历史总消耗积分", default=0)
    member_code = models.CharField("会员编码", max_length=32, blank=True)
    invite_code = models.CharField(
        "邀请码", max_length=16, unique=True, default=generate_invite_code
    )
    invited_by = models.ForeignKey(
        "self",
        verbose_name="邀请人",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invitees",
    )
    vip_level = models.PositiveSmallIntegerField("VIP 等级", default=0)
    vip_expire_at = models.DateTimeField("VIP 到期时间", null=True, blank=True)
    vip_exchanged_at = models.DateTimeField("VIP 兑换时间", null=True, blank=True)
    created_at = models.DateTimeField("注册时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "武学修习者"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.nickname or self.masked_phone

    @property
    def masked_phone(self):
        """脱敏手机号,如 138****8001。"""
        if len(self.phone) >= 7:
            return f"{self.phone[:3]}****{self.phone[-4:]}"
        return self.phone

    @property
    def display_name(self):
        return self.nickname or self.masked_phone

    @property
    def is_vip(self):
        return (
            self.vip_level > 0
            and self.vip_expire_at is not None
            and self.vip_expire_at > timezone.now()
        )

    @property
    def vip_days_left(self):
        if not self.is_vip:
            return 0
        return max((self.vip_expire_at - timezone.now()).days, 0)

    @property
    def is_platform_admin(self):
        return self.role in {self.Role.ADMIN, self.Role.SUPER_ADMIN}

    def grant_vip(self, days, level=1):
        """开通或续期 VIP:未过期则在原到期时间上累加。"""
        now = timezone.now()
        base = self.vip_expire_at if self.is_vip else now
        self.vip_level = max(self.vip_level, level)
        self.vip_expire_at = base + timedelta(days=days)
        self.vip_exchanged_at = now
        self.save(update_fields=["vip_level", "vip_expire_at", "vip_exchanged_at"])


class VerificationCode(models.Model):
    """短信验证码。"""

    phone = models.CharField("手机号", max_length=20, db_index=True)
    code = models.CharField("验证码", max_length=6)
    is_used = models.BooleanField("已使用", default=False)
    expires_at = models.DateTimeField("过期时间")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        verbose_name = "验证码"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.phone} - {self.code}"

    @property
    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()
