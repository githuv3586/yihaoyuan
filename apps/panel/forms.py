"""管理后台表单。"""
from django import forms

from apps.content.models import Article, Video
from apps.courses.models import Chapter, Course
from apps.notifications.models import Message
from apps.points.models import ExchangeItem
from apps.services.models import Service


class AdminLoginForm(forms.Form):
    phone = forms.CharField(label="手机号")
    password = forms.CharField(label="密码", widget=forms.PasswordInput)


class GrantPointsForm(forms.Form):
    DIRECTIONS = (("add", "增加"), ("sub", "扣减"))

    phone = forms.CharField(label="目标用户手机号")
    amount = forms.IntegerField(label="积分数量", min_value=1)
    direction = forms.ChoiceField(label="操作类型", choices=DIRECTIONS, initial="add")
    reason = forms.CharField(label="操作原因", max_length=100)


class UserEditForm(forms.Form):
    from apps.users.models import User as _U

    nickname = forms.CharField(label="昵称", max_length=64, required=False)
    role = forms.ChoiceField(label="角色", choices=_U.Role.choices)
    status = forms.ChoiceField(label="状态", choices=_U.Status.choices)


class VipForm(forms.Form):
    level = forms.IntegerField(label="VIP 等级", min_value=0, initial=1)
    days = forms.IntegerField(label="延长天数", min_value=0, initial=30)


class ReviewOrderForm(forms.Form):
    DECISIONS = (("approved", "通过"), ("rejected", "拒绝"))

    decision = forms.ChoiceField(choices=DECISIONS)
    note = forms.CharField(required=False, max_length=300)

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("decision") == "rejected" and not cleaned.get("note"):
            self.add_error("note", "拒绝时必须填写审核备注")
        return cleaned


class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = [
            "title", "category", "desc", "content", "cover", "teacher",
            "price", "original_price", "points_cost", "tags",
            "lesson_count", "sort_order", "status",
        ]


class ChapterForm(forms.ModelForm):
    class Meta:
        model = Chapter
        fields = ["title", "sort_order", "is_free", "video_url", "duration"]


class ServiceForm(forms.ModelForm):
    class Meta:
        model = Service
        fields = [
            "name", "desc", "icon", "price", "original_price",
            "points_cost", "features", "sort_order", "status",
        ]


class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ["title", "summary", "content", "cover", "author", "source_url",
                  "status", "published_at"]


class VideoForm(forms.ModelForm):
    class Meta:
        model = Video
        fields = ["title", "desc", "channel", "cover", "video_url", "duration",
                  "status", "sort_order"]


class SendMessageForm(forms.Form):
    TARGETS = (
        ("phone", "指定手机号"),
        ("all", "全部用户"),
        ("vip", "VIP 用户"),
        ("normal", "普通用户"),
    )

    target = forms.ChoiceField(label="发送对象", choices=TARGETS, initial="phone")
    phone = forms.CharField(label="手机号", required=False)
    type = forms.ChoiceField(label="消息类型", choices=Message.Type.choices)
    title = forms.CharField(label="标题", max_length=120)
    content = forms.CharField(label="内容", widget=forms.Textarea)
    link = forms.CharField(label="跳转链接", required=False, max_length=200)

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("target") == "phone" and not cleaned.get("phone"):
            self.add_error("phone", "请填写目标用户手机号")
        return cleaned


class ExchangeItemForm(forms.ModelForm):
    class Meta:
        model = ExchangeItem
        fields = ["title", "desc", "points_cost", "is_vip", "vip_days",
                  "status", "sort_order"]
