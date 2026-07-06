from django.contrib import admin

from .models import ExchangeItem, PointExchange, PointLedger


@admin.register(PointLedger)
class PointLedgerAdmin(admin.ModelAdmin):
    list_display = ("ledger_id", "user", "type", "change", "balance_after", "created_at")
    list_filter = ("type",)
    search_fields = ("ledger_id", "user__phone")


@admin.register(ExchangeItem)
class ExchangeItemAdmin(admin.ModelAdmin):
    list_display = ("title", "points_cost", "is_vip", "vip_days", "status")


@admin.register(PointExchange)
class PointExchangeAdmin(admin.ModelAdmin):
    list_display = ("exchange_id", "user", "item_title", "points_cost", "status", "created_at")
    list_filter = ("status",)
