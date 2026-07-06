"""H5 移动端视图:登录、首页 feed、武学课堂、文章、积分、消息、个人中心、报单。"""
import random
from datetime import timedelta

from django.conf import settings
from django.contrib import messages as flash
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.db.models import F, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.content.models import Article, Video
from apps.courses.models import Course, Enrollment
from apps.notifications.models import Message, notify
from apps.orders.models import Order
from apps.points.models import ExchangeItem, PointExchange, PointLedger
from apps.points.services import InsufficientPointsError, change_points
from apps.users.models import User, VerificationCode

# ---------- 认证 ----------


@require_POST
def send_code(request):
    """发送短信验证码(开发环境返回固定验证码)。"""
    from .forms import SendCodeForm

    form = SendCodeForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"ok": False, "msg": "请输入正确的手机号"}, status=400)

    phone = form.cleaned_data["phone"]
    code = (
        settings.DEV_SMS_CODE
        if settings.DEV_SMS_MODE
        else f"{random.randint(100000, 999999)}"
    )
    VerificationCode.objects.create(
        phone=phone,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    # 生产环境应在此处调用短信服务商 API 下发验证码
    payload = {"ok": True, "msg": "验证码已发送"}
    if settings.DEV_SMS_MODE:
        payload["dev_code"] = code
    return JsonResponse(payload)


def login_view(request):
    """手机号 + 验证码登录/注册。"""
    from .forms import LoginForm

    if request.user.is_authenticated:
        return redirect("h5:home")

    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            phone = form.cleaned_data["phone"]
            code = form.cleaned_data["code"]
            vc = (
                VerificationCode.objects.filter(phone=phone, code=code)
                .order_by("-created_at")
                .first()
            )
            if vc is None or not vc.is_valid:
                form.add_error("code", "验证码错误或已过期")
            else:
                vc.is_used = True
                vc.save(update_fields=["is_used"])
                user, created = _get_or_create_user(
                    phone, form.cleaned_data.get("invite_code", "")
                )
                if user.status == User.Status.BANNED:
                    form.add_error(None, "账号已被禁用,请联系客服")
                else:
                    user.last_login = timezone.now()
                    user.save(update_fields=["last_login"])
                    auth_login(request, user)
                    if created:
                        flash.success(request, "欢迎加入鹿功汇,开启武学修习之旅!")
                    return redirect(request.GET.get("next") or "h5:home")
    else:
        form = LoginForm()

    return render(request, "h5/login.html", {"form": form})


def _get_or_create_user(phone, invite_code):
    """按手机号获取或注册用户,注册时发放奖励积分。"""
    user = User.objects.filter(phone=phone).first()
    if user:
        return user, False

    inviter = None
    if invite_code:
        inviter = User.objects.filter(invite_code=invite_code).first()

    user = User.objects.create_user(
        phone=phone,
        nickname=f"修习者{phone[-4:]}",
        invited_by=inviter,
    )
    change_points(
        user, 100, PointLedger.Type.REGISTER, "注册奖励"
    )
    notify(user, "欢迎加入鹿功汇", "传承武学 · 修习身心。注册奖励 100 积分已到账。",
           Message.Type.POINTS)
    if inviter:
        change_points(
            inviter, 50, PointLedger.Type.INVITE, f"邀请好友 {user.masked_phone} 注册"
        )
        notify(inviter, "邀请奖励到账",
               f"好友 {user.masked_phone} 通过你的邀请码注册,奖励 50 积分。",
               Message.Type.POINTS)
    return user, True


def logout_view(request):
    auth_logout(request)
    return redirect("h5:login")


# ---------- 首页 feed ----------


def home(request):
    """首页:武学传承 / 武学短剧 短视频 feed。"""
    channel = request.GET.get("channel", "")
    videos = Video.objects.filter(status=Video.Status.PUBLISHED)
    if channel in dict(Video.Channel.choices):
        videos = videos.filter(channel=channel)
    return render(request, "h5/home.html", {
        "videos": videos[:50],
        "channel": channel,
        "channels": Video.Channel.choices,
    })


@require_POST
@login_required
def like_video(request, pk):
    updated = Video.objects.filter(pk=pk).update(like_count=F("like_count") + 1)
    if not updated:
        return JsonResponse({"ok": False}, status=404)
    video = Video.objects.get(pk=pk)
    return JsonResponse({"ok": True, "like_count": video.like_count})


# ---------- 武学课堂 ----------


def course_list(request):
    category = request.GET.get("category", "")
    keyword = request.GET.get("q", "").strip()

    courses = Course.objects.filter(status=Course.Status.PUBLISHED)
    if category in dict(Course.Category.choices):
        courses = courses.filter(category=category)
    if keyword:
        courses = courses.filter(
            Q(title__icontains=keyword) | Q(desc__icontains=keyword)
        )

    paginator = Paginator(courses, 10)
    page = paginator.get_page(request.GET.get("page"))

    return render(request, "h5/course_list.html", {
        "page": page,
        "category": category,
        "keyword": keyword,
        "categories": Course.Category.choices,
    })


def course_detail(request, course_id):
    course = get_object_or_404(
        Course, course_id=course_id, status=Course.Status.PUBLISHED
    )
    Course.objects.filter(pk=course.pk).update(view_count=F("view_count") + 1)

    enrolled = False
    if request.user.is_authenticated:
        enrolled = Enrollment.objects.filter(
            user=request.user, course=course
        ).exists()

    return render(request, "h5/course_detail.html", {
        "course": course,
        "chapters": course.chapters.all(),
        "enrolled": enrolled,
    })


@require_POST
@login_required
def enroll_course(request, course_id):
    """报名修习课程(积分支付)。"""
    course = get_object_or_404(
        Course, course_id=course_id, status=Course.Status.PUBLISHED
    )
    if Enrollment.objects.filter(user=request.user, course=course).exists():
        flash.info(request, "你已报名该课程")
        return redirect("h5:course_detail", course_id=course_id)

    try:
        if course.points_cost > 0:
            change_points(
                request.user,
                -course.points_cost,
                PointLedger.Type.COURSE_ENROLL,
                f"报名课程《{course.title}》",
                ref_id=course.course_id,
            )
        Enrollment.objects.create(
            user=request.user, course=course, points_paid=course.points_cost
        )
    except InsufficientPointsError:
        flash.error(request, "积分余额不足,无法报名该课程")
        return redirect("h5:course_detail", course_id=course_id)
    except IntegrityError:
        flash.info(request, "你已报名该课程")
        return redirect("h5:course_detail", course_id=course_id)

    Course.objects.filter(pk=course.pk).update(enroll_count=F("enroll_count") + 1)
    notify(
        request.user,
        "报名成功",
        f"你已成功报名《{course.title}》,开始修习吧!",
        Message.Type.COURSE,
    )
    flash.success(request, f"报名成功,消耗 {course.points_cost} 积分")
    return redirect("h5:course_detail", course_id=course_id)


@login_required
def my_enrollments(request):
    enrollments = (
        Enrollment.objects.filter(user=request.user).select_related("course")
    )
    return render(request, "h5/my_enrollments.html", {"enrollments": enrollments})


# ---------- 文章资讯 ----------


def article_list(request):
    keyword = request.GET.get("q", "").strip()
    articles = Article.objects.filter(status=Article.Status.PUBLISHED)
    if keyword:
        articles = articles.filter(
            Q(title__icontains=keyword) | Q(summary__icontains=keyword)
        )
    paginator = Paginator(articles, 20)
    page = paginator.get_page(request.GET.get("page"))
    return render(request, "h5/article_list.html", {"page": page, "keyword": keyword})


def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk, status=Article.Status.PUBLISHED)
    Article.objects.filter(pk=pk).update(view_count=F("view_count") + 1)
    return render(request, "h5/article_detail.html", {"article": article})


@require_POST
@login_required
def like_article(request, pk):
    updated = Article.objects.filter(pk=pk).update(like_count=F("like_count") + 1)
    if not updated:
        return JsonResponse({"ok": False}, status=404)
    article = Article.objects.get(pk=pk)
    return JsonResponse({"ok": True, "like_count": article.like_count})


# ---------- 报单 ----------


@login_required
def order_create(request):
    from .forms import OrderForm

    if request.method == "POST":
        form = OrderForm(request.POST)
        if form.is_valid():
            order = form.save(commit=False)
            order.user = request.user
            order.save()
            notify(
                request.user,
                "报单已提交",
                f"你的报单 {order.order_id} 已提交,请等待审核。",
                Message.Type.ORDER,
            )
            flash.success(request, "报单提交成功,请等待审核")
            return redirect("h5:order_list")
    else:
        form = OrderForm(initial={
            "contact_name": request.user.nickname,
            "phone": request.user.phone,
        })
    return render(request, "h5/order_form.html", {"form": form})


@login_required
def order_list(request):
    orders = request.user.orders.all()
    return render(request, "h5/order_list.html", {"orders": orders})


# ---------- 积分与兑换 ----------


@login_required
def points_home(request):
    ledgers = request.user.point_ledgers.all()[:50]
    items = ExchangeItem.objects.filter(status=ExchangeItem.Status.ACTIVE)
    return render(request, "h5/points.html", {"ledgers": ledgers, "items": items})


@require_POST
@login_required
def exchange_item(request, pk):
    """积分兑换商品/VIP 会员。"""
    item = get_object_or_404(ExchangeItem, pk=pk, status=ExchangeItem.Status.ACTIVE)
    try:
        change_points(
            request.user,
            -item.points_cost,
            PointLedger.Type.VIP_EXCHANGE if item.is_vip else PointLedger.Type.EXCHANGE,
            f"兑换 {item.title}",
        )
    except InsufficientPointsError:
        flash.error(request, "积分余额不足,无法兑换")
        return redirect("h5:points")

    exchange = PointExchange.objects.create(
        user=request.user,
        item=item,
        item_title=item.title,
        points_cost=item.points_cost,
    )
    if item.is_vip and item.vip_days > 0:
        request.user.grant_vip(item.vip_days)
        exchange.status = PointExchange.Status.PROCESSED
        exchange.processed_at = timezone.now()
        exchange.save(update_fields=["status", "processed_at"])
        notify(
            request.user,
            "VIP 开通成功",
            f"你已成功兑换 {item.title},有效期至 "
            f"{timezone.localtime(request.user.vip_expire_at):%Y-%m-%d}。",
            Message.Type.POINTS,
        )
        flash.success(request, f"兑换成功,VIP 已生效 {item.vip_days} 天")
    else:
        notify(
            request.user,
            "兑换申请已提交",
            f"你的兑换「{item.title}」已提交,运营将尽快处理。",
            Message.Type.POINTS,
        )
        flash.success(request, "兑换申请已提交")
    return redirect("h5:points")


# ---------- 消息 ----------


@login_required
def message_list(request):
    msgs = request.user.messages.all()[:100]
    return render(request, "h5/messages.html", {"msgs": msgs})


@require_POST
@login_required
def message_read(request, pk):
    Message.objects.filter(pk=pk, user=request.user).update(is_read=True)
    return JsonResponse({"ok": True})


# ---------- 个人中心 ----------


@login_required
def profile(request):
    from .forms import ProfileForm

    if request.method == "POST":
        form = ProfileForm(request.POST)
        if form.is_valid():
            request.user.nickname = form.cleaned_data["nickname"] or request.user.nickname
            if form.cleaned_data["avatar"]:
                request.user.avatar = form.cleaned_data["avatar"]
            request.user.save(update_fields=["nickname", "avatar"])
            flash.success(request, "资料已更新")
            return redirect("h5:profile")

    unread_count = request.user.messages.filter(is_read=False).count()
    enroll_count = request.user.enrollments.count()
    return render(request, "h5/profile.html", {
        "unread_count": unread_count,
        "enroll_count": enroll_count,
    })
