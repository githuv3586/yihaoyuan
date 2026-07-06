"""武学课程、章节与报名模型。"""
import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone


def generate_course_id():
    ts = timezone.now().strftime("%Y%m%d%H%M%S")
    return f"CRS{ts}{secrets.token_hex(2).upper()}"


class Course(models.Model):
    """武学课程。"""

    class Category(models.TextChoices):
        FIST_FORMS = "fist_forms", "拳法套路"
        INTERNAL_ARTS = "internal_arts", "内功心法"
        WEAPONS = "weapons", "器械兵器"
        PHILOSOPHY = "philosophy", "武道哲学"
        WELLNESS = "wellness", "养生健身"
        SHORT_DRAMA = "shortdrama", "武学短剧"
        HERITAGE = "heritage", "武学传承"

    class Status(models.TextChoices):
        DRAFT = "draft", "草稿"
        PUBLISHED = "published", "已发布"
        ARCHIVED = "archived", "已下架"

    course_id = models.CharField(
        "课程编号", max_length=32, unique=True, default=generate_course_id
    )
    title = models.CharField("课程标题", max_length=120)
    desc = models.TextField("课程简介", blank=True)
    content = models.TextField("课程详情", blank=True)
    cover = models.URLField("封面图", blank=True)
    category = models.CharField("分类", max_length=20, choices=Category.choices)
    teacher = models.CharField("讲师", max_length=64, blank=True)
    price = models.DecimalField("售价(元)", max_digits=10, decimal_places=2, default=0)
    original_price = models.DecimalField(
        "划线价(元)", max_digits=10, decimal_places=2, null=True, blank=True
    )
    points_cost = models.PositiveIntegerField("积分价格", default=0)
    tags = models.CharField(
        "标签", max_length=200, blank=True, help_text="逗号分隔,如: 热门,推荐,新课"
    )
    lesson_count = models.PositiveIntegerField("课时数", default=0)
    status = models.CharField(
        "状态", max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    sort_order = models.IntegerField("排序权重", default=50)
    view_count = models.PositiveIntegerField("浏览量", default=0)
    enroll_count = models.PositiveIntegerField("报名人数", default=0)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        verbose_name = "武学课程"
        verbose_name_plural = verbose_name
        ordering = ["-sort_order", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def tag_list(self):
        return [t.strip() for t in self.tags.split(",") if t.strip()]


class Chapter(models.Model):
    """课程章节。"""

    course = models.ForeignKey(
        Course, verbose_name="所属课程", on_delete=models.CASCADE, related_name="chapters"
    )
    title = models.CharField("章节标题", max_length=120)
    sort_order = models.PositiveIntegerField("排序序号", default=1)
    is_free = models.BooleanField("免费试看", default=False)
    video_url = models.URLField("视频地址", blank=True)
    duration = models.CharField("时长", max_length=16, blank=True, help_text="如 12:30")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)

    class Meta:
        verbose_name = "课程章节"
        verbose_name_plural = verbose_name
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Enrollment(models.Model):
    """修习报名记录。"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="修习者",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course = models.ForeignKey(
        Course, verbose_name="课程", on_delete=models.CASCADE, related_name="enrollments"
    )
    points_paid = models.PositiveIntegerField("支付积分", default=0)
    created_at = models.DateTimeField("报名时间", auto_now_add=True)

    class Meta:
        verbose_name = "修习报名"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "course"], name="uniq_user_course")
        ]

    def __str__(self):
        return f"{self.user} 报名 {self.course}"
