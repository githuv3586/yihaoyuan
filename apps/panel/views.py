"""管理后台视图:看板、用户、积分、报单、课程、服务、内容、消息、日志。"""
import json
from datetime import timedelta

from django.contrib import messages as flash
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.core.paginator import Paginator
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.content.models import Article, Video
from apps.core.models import AdminLog, log_admin_action
from apps.courses.models import Chapter, Course, Enrollment
from apps.notifications.models import Message, notify
from apps.orders.models import Order
from apps.points.models import ExchangeItem, PointExchange, PointLedger
from apps.points.services import InsufficientPointsError, change_points
from apps.users.models import User

from .decorators import ADMIN_ROLES, PANEL_ROLES, panel_required, superadmin_required
from .forms import (
    AdminLoginForm,
    ArticleForm,
    ChapterForm,
    CourseForm,
    ExchangeItemForm,
    GrantPointsForm,
    ReviewOrderForm,
    SendMessageForm,
    ServiceForm,
    UserEditForm,
    VideoForm,
    VipForm,
)
from apps.services.models import Service

# ---------- 认证 ----------


def login_view(request):
    """管理员登录(手机号 + 密码,独立于 H5 验证码登录)。"""
    if request.user.is_authenticated and request.user.role in PANEL_ROLES:
        return redirect("panel:dashboard")

    if request.method == "POST":
        form = AdminLoginForm(request.POST)
        if form.is_valid():
            user = authenticate(
                request,
                username=form.cleaned_data["phone"],
                password=form.cleaned_data["password"],
            )
            if user is None:
                form.add_error(None, "手机号或密码错误")
            elif user.role not in PANEL_ROLES:
                form.add_error(None, "该账号无后台访问权限")
            elif user.status == User.Status.BANNED:
                form.add_error(None, "账号已被禁用")
            else:
                auth_login(request, user)
                return redirect("panel:dashboard")
    else:
        form = AdminLoginForm()

    return render(request, "panel/login.html", {"form": form})


def logout_view(request):
    auth_logout(request)
    return redirect("panel:login")


# ---------- 数据看板 ----------


@panel_required()
def dashboard(request):
    now = timezone.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    stats = {
        "total_users": User.objects.count(),
        "today_users": User.objects.filter(created_at__gte=today).count(),
        "total_points": User.objects.aggregate(s=Sum("points"))["s"] or 0,
        "pending_orders": Order.objects.filter(status=Order.Status.PENDING).count(),
        "vip_users": User.objects.filter(
            vip_level__gt=0, vip_expire_at__gt=now
        ).count(),
        "published_courses": Course.objects.filter(
            status=Course.Status.PUBLISHED
        ).count(),
        "total_enrollments": Enrollment.objects.count(),
    }

    # 近 30 天用户增长
    since = today - timedelta(days=29)
    daily = (
        User.objects.filter(created_at__gte=since)
        .extra(select={"day": "date(created_at)"})
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    daily_map = {str(row["day"]): row["count"] for row in daily}
    growth_labels, growth_values = [], []
    for i in range(30):
        day = (since + timedelta(days=i)).date()
        growth_labels.append(day.strftime("%m-%d"))
        growth_values.append(daily_map.get(str(day), 0))

    # 报单状态分布
    order_dist = list(
        Order.objects.values("status").annotate(count=Count("id"))
    )
    status_labels = dict(Order.Status.choices)

    # 课程热度 Top 10
    hot_courses = Course.objects.order_by("-enroll_count")[:10]

    # 待办事项
    todo = {
        "pending_orders": Order.objects.filter(
            status=Order.Status.PENDING
        ).order_by("created_at")[:5],
        "pending_exchanges": PointExchange.objects.filter(
            status=PointExchange.Status.SUBMITTED
        ).select_related("user")[:5],
        "expiring_vips": User.objects.filter(
            vip_level__gt=0,
            vip_expire_at__gt=now,
            vip_expire_at__lte=now + timedelta(days=3),
        )[:5],
    }

    return render(request, "panel/dashboard.html", {
        "stats": stats,
        "growth_labels": json.dumps(growth_labels),
        "growth_values": json.dumps(growth_values),
        "order_dist": json.dumps(
            [
                {"label": status_labels.get(row["status"], row["status"]),
                 "count": row["count"]}
                for row in order_dist
            ],
            ensure_ascii=False,
        ),
        "hot_courses": hot_courses,
        "todo": todo,
    })


# ---------- 用户管理 ----------


@panel_required(PANEL_ROLES)
def user_list(request):
    users = User.objects.all()

    keyword = request.GET.get("q", "").strip()
    role = request.GET.get("role", "")
    status = request.GET.get("status", "")

    # 咨询师仅能查看普通学员/会员
    if request.user.role == User.Role.CONSULTANT:
        users = users.filter(role__in=[User.Role.CLIENT, User.Role.MEMBER])

    if keyword:
        users = users.filter(Q(phone__icontains=keyword) | Q(nickname__icontains=keyword))
    if role:
        users = users.filter(role=role)
    if status:
        users = users.filter(status=status)

    page = Paginator(users, 20).get_page(request.GET.get("page"))
    return render(request, "panel/user_list.html", {
        "page": page,
        "keyword": keyword,
        "role": role,
        "status": status,
        "roles": User.Role.choices,
        "statuses": User.Status.choices,
    })


@panel_required(PANEL_ROLES)
def user_detail(request, pk):
    target = get_object_or_404(User, pk=pk)
    return render(request, "panel/user_detail.html", {
        "target": target,
        "orders": target.orders.all()[:10],
        "enrollments": target.enrollments.select_related("course")[:10],
        "ledgers": target.point_ledgers.all()[:10],
        "exchanges": target.point_exchanges.all()[:10],
        "edit_form": UserEditForm(initial={
            "nickname": target.nickname,
            "role": target.role,
            "status": target.status,
        }),
        "vip_form": VipForm(),
        "is_super": request.user.role == User.Role.SUPER_ADMIN,
    })


@require_POST
@panel_required()
def user_edit(request, pk):
    target = get_object_or_404(User, pk=pk)
    form = UserEditForm(request.POST)
    if form.is_valid():
        new_role = form.cleaned_data["role"]
        # 仅超管可修改角色
        if new_role != target.role and request.user.role != User.Role.SUPER_ADMIN:
            flash.error(request, "仅超级管理员可修改用户角色")
            return redirect("panel:user_detail", pk=pk)

        before = f"role={target.role}, status={target.status}, nickname={target.nickname}"
        target.nickname = form.cleaned_data["nickname"] or target.nickname
        target.role = new_role
        target.status = form.cleaned_data["status"]
        target.save(update_fields=["nickname", "role", "status"])
        log_admin_action(
            request, AdminLog.Module.USERS, AdminLog.Action.UPDATE,
            target_type="users", target_id=target.pk,
            detail=f"before: {before}; after: role={target.role}, "
                   f"status={target.status}, nickname={target.nickname}",
        )
        flash.success(request, "用户信息已更新")
    else:
        flash.error(request, "表单校验失败")
    return redirect("panel:user_detail", pk=pk)


@require_POST
@panel_required()
def user_set_vip(request, pk):
    target = get_object_or_404(User, pk=pk)
    form = VipForm(request.POST)
    if form.is_valid():
        level = form.cleaned_data["level"]
        days = form.cleaned_data["days"]
        if level == 0:
            target.vip_level = 0
            target.vip_expire_at = None
            target.save(update_fields=["vip_level", "vip_expire_at"])
            action_desc = "取消 VIP"
        else:
            target.grant_vip(days, level=level)
            action_desc = f"设置 VIP 等级 {level},延长 {days} 天"
        log_admin_action(
            request, AdminLog.Module.VIP, AdminLog.Action.UPDATE,
            target_type="users", target_id=target.pk, detail=action_desc,
        )
        notify(target, "VIP 状态变更", f"管理员已为你{action_desc}。")
        flash.success(request, action_desc)
    return redirect("panel:user_detail", pk=pk)


# ---------- 积分管理 ----------


@panel_required()
def points_grant(request):
    if request.method == "POST":
        form = GrantPointsForm(request.POST)
        if form.is_valid():
            target = User.objects.filter(phone=form.cleaned_data["phone"]).first()
            if target is None:
                form.add_error("phone", "未找到该手机号对应的用户")
            else:
                amount = form.cleaned_data["amount"]
                change = amount if form.cleaned_data["direction"] == "add" else -amount
                reason = form.cleaned_data["reason"]
                try:
                    ledger = change_points(
                        target, change, PointLedger.Type.GRANT,
                        f"管理员{'发放' if change > 0 else '扣减'}:{reason}",
                        operator=request.user,
                    )
                except InsufficientPointsError as exc:
                    form.add_error("amount", str(exc))
                else:
                    log_admin_action(
                        request, AdminLog.Module.POINTS, AdminLog.Action.GRANT,
                        target_type="users", target_id=target.pk,
                        detail=f"{change:+d} 积分({reason}),流水 {ledger.ledger_id}",
                    )
                    notify(
                        target, "积分变动通知",
                        f"管理员{'发放' if change > 0 else '扣减'} {amount} 积分"
                        f"({reason}),当前余额 {ledger.balance_after}。",
                        Message.Type.POINTS,
                    )
                    flash.success(
                        request,
                        f"已为 {target.display_name} {'发放' if change > 0 else '扣减'} "
                        f"{amount} 积分",
                    )
                    return redirect("panel:points_grant")
    else:
        form = GrantPointsForm()
    return render(request, "panel/points_grant.html", {"form": form})


@panel_required()
def ledger_list(request):
    ledgers = PointLedger.objects.select_related("user")

    keyword = request.GET.get("q", "").strip()
    ledger_type = request.GET.get("type", "")
    if keyword:
        ledgers = ledgers.filter(
            Q(user__phone__icontains=keyword) | Q(ledger_id__icontains=keyword)
        )
    if ledger_type:
        ledgers = ledgers.filter(type=ledger_type)

    page = Paginator(ledgers, 20).get_page(request.GET.get("page"))
    return render(request, "panel/ledger_list.html", {
        "page": page,
        "keyword": keyword,
        "ledger_type": ledger_type,
        "types": PointLedger.Type.choices,
    })


@panel_required()
def exchange_list(request):
    exchanges = PointExchange.objects.select_related("user", "item")
    status = request.GET.get("status", "")
    if status:
        exchanges = exchanges.filter(status=status)
    page = Paginator(exchanges, 20).get_page(request.GET.get("page"))
    return render(request, "panel/exchange_list.html", {
        "page": page,
        "status": status,
        "statuses": PointExchange.Status.choices,
    })


@require_POST
@panel_required()
def exchange_process(request, pk):
    exchange = get_object_or_404(PointExchange, pk=pk)
    action = request.POST.get("action")
    if exchange.status != PointExchange.Status.SUBMITTED:
        flash.error(request, "该兑换单已处理")
        return redirect("panel:exchange_list")

    if action == "process":
        exchange.status = PointExchange.Status.PROCESSED
        exchange.processed_at = timezone.now()
        exchange.save(update_fields=["status", "processed_at"])
        notify(exchange.user, "兑换已完成",
               f"你的兑换「{exchange.item_title}」已处理完成。", Message.Type.POINTS)
        log_admin_action(
            request, AdminLog.Module.POINTS, AdminLog.Action.APPROVE,
            target_type="point_exchanges", target_id=exchange.exchange_id,
            detail=f"标记已处理:{exchange.item_title}",
        )
        flash.success(request, "已标记为已处理")
    elif action == "cancel":
        exchange.status = PointExchange.Status.CANCELLED
        exchange.processed_at = timezone.now()
        exchange.save(update_fields=["status", "processed_at"])
        # 取消时退还积分
        change_points(
            exchange.user, exchange.points_cost, PointLedger.Type.ADJUSTMENT,
            f"兑换取消退还:{exchange.item_title}", ref_id=exchange.exchange_id,
            operator=request.user,
        )
        notify(exchange.user, "兑换已取消",
               f"你的兑换「{exchange.item_title}」已取消,{exchange.points_cost} "
               f"积分已退回。", Message.Type.POINTS)
        log_admin_action(
            request, AdminLog.Module.POINTS, AdminLog.Action.REVOKE,
            target_type="point_exchanges", target_id=exchange.exchange_id,
            detail=f"取消并退还 {exchange.points_cost} 积分",
        )
        flash.success(request, "已取消并退还积分")
    return redirect("panel:exchange_list")


# ---------- 报单管理 ----------


@panel_required(PANEL_ROLES)
def order_list(request):
    orders = Order.objects.select_related("user", "reviewer")

    status = request.GET.get("status", "")
    order_type = request.GET.get("type", "")
    keyword = request.GET.get("q", "").strip()
    if status:
        orders = orders.filter(status=status)
    if order_type:
        orders = orders.filter(type=order_type)
    if keyword:
        orders = orders.filter(
            Q(order_id__icontains=keyword) | Q(phone__icontains=keyword)
        )

    page = Paginator(orders, 20).get_page(request.GET.get("page"))
    return render(request, "panel/order_list.html", {
        "page": page,
        "status": status,
        "order_type": order_type,
        "keyword": keyword,
        "statuses": Order.Status.choices,
        "types": Order.Type.choices,
    })


@panel_required(PANEL_ROLES)
def order_detail(request, pk):
    order = get_object_or_404(
        Order.objects.select_related("user", "reviewer"), pk=pk
    )
    return render(request, "panel/order_detail.html", {
        "order": order,
        "form": ReviewOrderForm(),
    })


@require_POST
@panel_required(PANEL_ROLES)
def order_review(request, pk):
    order = get_object_or_404(Order, pk=pk)
    if order.status != Order.Status.PENDING:
        flash.error(request, "该报单已审核,不可重复操作")
        return redirect("panel:order_detail", pk=pk)

    form = ReviewOrderForm(request.POST)
    if not form.is_valid():
        flash.error(request, "拒绝时必须填写审核备注")
        return redirect("panel:order_detail", pk=pk)

    decision = form.cleaned_data["decision"]
    order.status = decision
    order.review_note = form.cleaned_data["note"]
    order.reviewer = request.user
    order.reviewed_at = timezone.now()
    order.save(update_fields=["status", "review_note", "reviewer", "reviewed_at"])

    passed = decision == Order.Status.APPROVED
    log_admin_action(
        request, AdminLog.Module.ORDERS,
        AdminLog.Action.APPROVE if passed else AdminLog.Action.REJECT,
        target_type="orders", target_id=order.order_id,
        detail=f"备注:{order.review_note or '无'}",
    )
    notify(
        order.user,
        f"报单审核{'通过' if passed else '未通过'}",
        f"你的报单 {order.order_id} 审核{'已通过' if passed else '被拒绝'}。"
        + (f"备注:{order.review_note}" if order.review_note else ""),
        Message.Type.ORDER,
    )
    flash.success(request, f"报单已{'通过' if passed else '拒绝'}")
    return redirect("panel:order_detail", pk=pk)


# ---------- 课程管理 ----------


@panel_required()
def course_list(request):
    courses = Course.objects.all()
    keyword = request.GET.get("q", "").strip()
    category = request.GET.get("category", "")
    status = request.GET.get("status", "")
    if keyword:
        courses = courses.filter(title__icontains=keyword)
    if category:
        courses = courses.filter(category=category)
    if status:
        courses = courses.filter(status=status)
    page = Paginator(courses, 20).get_page(request.GET.get("page"))
    return render(request, "panel/course_list.html", {
        "page": page,
        "keyword": keyword,
        "category": category,
        "status": status,
        "categories": Course.Category.choices,
        "statuses": Course.Status.choices,
    })


@panel_required()
def course_edit(request, pk=None):
    course = get_object_or_404(Course, pk=pk) if pk else None
    if request.method == "POST":
        form = CourseForm(request.POST, instance=course)
        if form.is_valid():
            obj = form.save()
            log_admin_action(
                request, AdminLog.Module.COURSES,
                AdminLog.Action.UPDATE if course else AdminLog.Action.CREATE,
                target_type="courses", target_id=obj.course_id,
                detail=f"课程《{obj.title}》",
            )
            flash.success(request, "课程已保存")
            return redirect("panel:course_list")
    else:
        form = CourseForm(instance=course)
    return render(request, "panel/course_form.html", {"form": form, "course": course})


@require_POST
@panel_required()
def course_toggle(request, pk):
    course = get_object_or_404(Course, pk=pk)
    if course.status == Course.Status.PUBLISHED:
        course.status = Course.Status.ARCHIVED
        action = "下架"
    else:
        course.status = Course.Status.PUBLISHED
        action = "上架"
    course.save(update_fields=["status"])
    log_admin_action(
        request, AdminLog.Module.COURSES, AdminLog.Action.UPDATE,
        target_type="courses", target_id=course.course_id,
        detail=f"{action}课程《{course.title}》",
    )
    flash.success(request, f"已{action}《{course.title}》")
    return redirect("panel:course_list")


@panel_required()
def chapter_list(request, pk):
    course = get_object_or_404(Course, pk=pk)
    if request.method == "POST":
        form = ChapterForm(request.POST)
        if form.is_valid():
            chapter = form.save(commit=False)
            chapter.course = course
            chapter.save()
            course.lesson_count = course.chapters.count()
            course.save(update_fields=["lesson_count"])
            log_admin_action(
                request, AdminLog.Module.COURSES, AdminLog.Action.CREATE,
                target_type="chapters", target_id=chapter.pk,
                detail=f"课程《{course.title}》新增章节「{chapter.title}」",
            )
            flash.success(request, "章节已添加")
            return redirect("panel:chapter_list", pk=pk)
    else:
        form = ChapterForm()
    return render(request, "panel/chapter_list.html", {
        "course": course,
        "chapters": course.chapters.all(),
        "form": form,
    })


@require_POST
@panel_required()
def chapter_delete(request, pk):
    chapter = get_object_or_404(Chapter, pk=pk)
    course = chapter.course
    title = chapter.title
    chapter.delete()
    course.lesson_count = course.chapters.count()
    course.save(update_fields=["lesson_count"])
    log_admin_action(
        request, AdminLog.Module.COURSES, AdminLog.Action.DELETE,
        target_type="chapters", target_id=pk,
        detail=f"删除课程《{course.title}》章节「{title}」",
    )
    flash.success(request, "章节已删除")
    return redirect("panel:chapter_list", pk=course.pk)


# ---------- 服务管理 ----------


@panel_required()
def service_list(request):
    services = Service.objects.all()
    keyword = request.GET.get("q", "").strip()
    if keyword:
        services = services.filter(name__icontains=keyword)
    page = Paginator(services, 20).get_page(request.GET.get("page"))
    return render(request, "panel/service_list.html", {"page": page, "keyword": keyword})


@panel_required()
def service_edit(request, pk=None):
    service = get_object_or_404(Service, pk=pk) if pk else None
    if request.method == "POST":
        form = ServiceForm(request.POST, instance=service)
        if form.is_valid():
            obj = form.save()
            log_admin_action(
                request, AdminLog.Module.SERVICES,
                AdminLog.Action.UPDATE if service else AdminLog.Action.CREATE,
                target_type="services", target_id=obj.service_id,
                detail=f"服务「{obj.name}」",
            )
            flash.success(request, "服务已保存")
            return redirect("panel:service_list")
    else:
        form = ServiceForm(instance=service)
    return render(request, "panel/service_form.html", {"form": form, "service": service})


# ---------- 内容管理(文章 / 视频) ----------


@panel_required()
def article_list(request):
    articles = Article.objects.all()
    keyword = request.GET.get("q", "").strip()
    if keyword:
        articles = articles.filter(title__icontains=keyword)
    page = Paginator(articles, 20).get_page(request.GET.get("page"))
    return render(request, "panel/article_list.html", {"page": page, "keyword": keyword})


@panel_required()
def article_edit(request, pk=None):
    article = get_object_or_404(Article, pk=pk) if pk else None
    if request.method == "POST":
        form = ArticleForm(request.POST, instance=article)
        if form.is_valid():
            obj = form.save(commit=False)
            if obj.status == Article.Status.PUBLISHED and obj.published_at is None:
                obj.published_at = timezone.now()
            obj.save()
            log_admin_action(
                request, AdminLog.Module.CONTENT,
                AdminLog.Action.UPDATE if article else AdminLog.Action.CREATE,
                target_type="articles", target_id=obj.pk,
                detail=f"文章《{obj.title}》",
            )
            flash.success(request, "文章已保存")
            return redirect("panel:article_list")
    else:
        form = ArticleForm(instance=article)
    return render(request, "panel/article_form.html", {"form": form, "article": article})


@panel_required()
def video_list(request):
    videos = Video.objects.all()
    channel = request.GET.get("channel", "")
    if channel:
        videos = videos.filter(channel=channel)
    page = Paginator(videos, 20).get_page(request.GET.get("page"))
    return render(request, "panel/video_list.html", {
        "page": page,
        "channel": channel,
        "channels": Video.Channel.choices,
    })


@panel_required()
def video_edit(request, pk=None):
    video = get_object_or_404(Video, pk=pk) if pk else None
    if request.method == "POST":
        form = VideoForm(request.POST, instance=video)
        if form.is_valid():
            obj = form.save()
            log_admin_action(
                request, AdminLog.Module.CONTENT,
                AdminLog.Action.UPDATE if video else AdminLog.Action.CREATE,
                target_type="videos", target_id=obj.pk,
                detail=f"视频「{obj.title}」",
            )
            flash.success(request, "视频已保存")
            return redirect("panel:video_list")
    else:
        form = VideoForm(instance=video)
    return render(request, "panel/video_form.html", {"form": form, "video": video})


# ---------- 消息管理 ----------


@panel_required()
def message_list(request):
    msgs = Message.objects.select_related("user")
    keyword = request.GET.get("q", "").strip()
    if keyword:
        msgs = msgs.filter(
            Q(title__icontains=keyword) | Q(user__phone__icontains=keyword)
        )
    page = Paginator(msgs, 20).get_page(request.GET.get("page"))
    return render(request, "panel/message_list.html", {"page": page, "keyword": keyword})


@panel_required()
def message_send(request):
    if request.method == "POST":
        form = SendMessageForm(request.POST)
        if form.is_valid():
            target = form.cleaned_data["target"]
            now = timezone.now()
            if target == "phone":
                users = User.objects.filter(phone=form.cleaned_data["phone"])
                if not users.exists():
                    form.add_error("phone", "未找到该手机号对应的用户")
            elif target == "vip":
                users = User.objects.filter(vip_level__gt=0, vip_expire_at__gt=now)
            elif target == "normal":
                users = User.objects.filter(
                    Q(vip_level=0) | Q(vip_expire_at__lte=now)
                    | Q(vip_expire_at__isnull=True)
                )
            else:
                users = User.objects.all()

            if form.is_valid():
                count = 0
                for user in users:
                    notify(
                        user,
                        form.cleaned_data["title"],
                        form.cleaned_data["content"],
                        form.cleaned_data["type"],
                        form.cleaned_data["link"],
                    )
                    count += 1
                log_admin_action(
                    request, AdminLog.Module.MESSAGES, AdminLog.Action.CREATE,
                    target_type="messages",
                    detail=f"发送消息「{form.cleaned_data['title']}」给 {count} 位用户",
                )
                flash.success(request, f"消息已发送给 {count} 位用户")
                return redirect("panel:message_list")
    else:
        form = SendMessageForm()
    return render(request, "panel/message_send.html", {"form": form})


# ---------- 兑换商品目录 ----------


@panel_required()
def catalog_list(request):
    items = ExchangeItem.objects.all()
    return render(request, "panel/catalog_list.html", {"items": items})


@panel_required()
def catalog_edit(request, pk=None):
    item = get_object_or_404(ExchangeItem, pk=pk) if pk else None
    if request.method == "POST":
        form = ExchangeItemForm(request.POST, instance=item)
        if form.is_valid():
            obj = form.save()
            log_admin_action(
                request, AdminLog.Module.SYSTEM,
                AdminLog.Action.UPDATE if item else AdminLog.Action.CREATE,
                target_type="exchange_items", target_id=obj.pk,
                detail=f"兑换商品「{obj.title}」",
            )
            flash.success(request, "兑换商品已保存")
            return redirect("panel:catalog_list")
    else:
        form = ExchangeItemForm(instance=item)
    return render(request, "panel/catalog_form.html", {"form": form, "item": item})


# ---------- 操作日志 ----------


@panel_required(PANEL_ROLES)
def log_list(request):
    logs = AdminLog.objects.select_related("operator")

    # 咨询师仅能查看自己的操作
    if request.user.role == User.Role.CONSULTANT:
        logs = logs.filter(operator=request.user)

    module = request.GET.get("module", "")
    action = request.GET.get("action", "")
    keyword = request.GET.get("q", "").strip()
    if module:
        logs = logs.filter(module=module)
    if action:
        logs = logs.filter(action=action)
    if keyword:
        logs = logs.filter(
            Q(operator_name__icontains=keyword) | Q(target_id__icontains=keyword)
        )

    page = Paginator(logs, 20).get_page(request.GET.get("page"))
    return render(request, "panel/log_list.html", {
        "page": page,
        "module": module,
        "action": action,
        "keyword": keyword,
        "modules": AdminLog.Module.choices,
        "actions": AdminLog.Action.choices,
    })


# ---------- VIP 管理 ----------


@panel_required()
def vip_list(request):
    now = timezone.now()
    users = User.objects.filter(vip_level__gt=0).order_by("vip_expire_at")
    expire = request.GET.get("expire", "")
    if expire == "valid":
        users = users.filter(vip_expire_at__gt=now)
    elif expire == "soon":
        users = users.filter(
            vip_expire_at__gt=now, vip_expire_at__lte=now + timedelta(days=7)
        )
    elif expire == "expired":
        users = users.filter(vip_expire_at__lte=now)
    page = Paginator(users, 20).get_page(request.GET.get("page"))
    return render(request, "panel/vip_list.html", {"page": page, "expire": expire})
