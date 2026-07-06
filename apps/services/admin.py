from django.contrib import admin

from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("service_id", "name", "price", "points_cost", "status", "sort_order")
    list_filter = ("status",)
    search_fields = ("name",)
