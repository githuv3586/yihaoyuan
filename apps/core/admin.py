from django.contrib import admin

from .models import AdminLog


@admin.register(AdminLog)
class AdminLogAdmin(admin.ModelAdmin):
    list_display = ("operator_name", "module", "action", "target_type", "target_id", "created_at")
    list_filter = ("module", "action")
    search_fields = ("operator_name", "target_id")
