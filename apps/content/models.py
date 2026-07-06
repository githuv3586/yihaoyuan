"""武学文章与短视频 feed 模型。"""
from django.db import models


class Article(models.Model):
    """武学文章(可同步公众号)。"""

    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "已发布"

    title = models.CharField("标题", max_length=200)
    summary = models.CharField("摘要", max_length=300, blank=True)
    content = models.TextField("正文", blank=True)
    cover = models.URLField("封面图", blank=True)
    author = models.CharField("作者", max_length=64, blank=True)
    source_url = models.URLField("公众号原文链接", blank=True)
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.PUBLISHED
    )
    view_count = models.PositiveIntegerField("阅读量", default=0)
    like_count = models.PositiveIntegerField("点赞数", default=0)
    published_at = models.DateTimeField("发布时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "武学文章"
        verbose_name_plural = verbose_name
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title


class Video(models.Model):
    """首页短视频 feed 素材。"""

    class Channel(models.TextChoices):
        HERITAGE = "heritage", "武学传承"
        SHORT_DRAMA = "shortdrama", "武学短剧"

    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "已发布"

    title = models.CharField("标题", max_length=200)
    desc = models.CharField("描述", max_length=300, blank=True)
    channel = models.CharField(
        "频道", max_length=20, choices=Channel.choices, default=Channel.HERITAGE
    )
    cover = models.URLField("封面图", blank=True)
    video_url = models.URLField("视频地址", blank=True)
    duration = models.CharField("时长", max_length=16, blank=True)
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.PUBLISHED
    )
    like_count = models.PositiveIntegerField("点赞数", default=0)
    view_count = models.PositiveIntegerField("播放量", default=0)
    sort_order = models.IntegerField("排序权重", default=50)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "短视频"
        verbose_name_plural = verbose_name
        ordering = ["-sort_order", "-created_at"]

    def __str__(self):
        return self.title
