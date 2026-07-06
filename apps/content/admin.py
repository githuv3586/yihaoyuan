from django.contrib import admin

from .models import Article, Video


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "status", "view_count", "published_at")
    list_filter = ("status",)
    search_fields = ("title",)


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ("title", "channel", "status", "like_count", "view_count")
    list_filter = ("channel", "status")
    search_fields = ("title",)
