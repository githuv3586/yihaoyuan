from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, VerificationCode


@admin.register(User)
class PlatformUserAdmin(UserAdmin):
    list_display = ("phone", "nickname", "role", "points", "vip_level", "status", "created_at")
    list_filter = ("role", "status", "vip_level")
    search_fields = ("phone", "nickname")
    ordering = ("-created_at",)
    fieldsets = UserAdmin.fieldsets + (
        (
            "平台信息",
            {
                "fields": (
                    "phone", "nickname", "avatar", "role", "status",
                    "points", "total_points", "used_points",
                    "member_code", "invite_code", "invited_by",
                    "vip_level", "vip_expire_at", "vip_exchanged_at",
                )
            },
        ),
    )


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("phone", "code", "is_used", "expires_at", "created_at")
