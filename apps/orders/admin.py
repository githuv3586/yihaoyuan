from django.contrib import admin

from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_id", "user", "type", "status", "contact_name", "created_at")
    list_filter = ("type", "status")
    search_fields = ("order_id", "contact_name", "phone")
