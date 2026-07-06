from django.contrib import admin

from .models import Chapter, Course, Enrollment


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("course_id", "title", "category", "teacher", "points_cost", "status", "enroll_count")
    list_filter = ("category", "status")
    search_fields = ("title", "course_id")
    inlines = [ChapterInline]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "points_paid", "created_at")
