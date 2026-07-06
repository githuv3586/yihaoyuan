"""管理后台核心流程测试。"""
from django.test import TestCase
from django.urls import reverse

from apps.core.models import AdminLog
from apps.courses.models import Course
from apps.orders.models import Order
from apps.points.models import PointExchange, PointLedger
from apps.points.services import change_points
from apps.users.models import User


def make_admin(role=User.Role.ADMIN, phone="13800000010"):
    user = User.objects.create_user(phone=phone, password="pass12345", role=role)
    return user


class PanelAuthTests(TestCase):
    def test_login_requires_panel_role(self):
        User.objects.create_user(phone="13800000020", password="pass12345")
        resp = self.client.post(reverse("panel:login"), {
            "phone": "13800000020", "password": "pass12345",
        })
        self.assertContains(resp, "无后台访问权限")

    def test_admin_can_login_and_view_dashboard(self):
        make_admin()
        resp = self.client.post(reverse("panel:login"), {
            "phone": "13800000010", "password": "pass12345",
        })
        self.assertRedirects(resp, reverse("panel:dashboard"))
        resp = self.client.get(reverse("panel:dashboard"))
        self.assertContains(resp, "总用户数")

    def test_anonymous_redirected_to_login(self):
        resp = self.client.get(reverse("panel:dashboard"))
        self.assertRedirects(resp, reverse("panel:login"))


class GrantPointsTests(TestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_login(self.admin)
        self.target = User.objects.create_user(phone="13800000030", points=100)

    def test_grant_points_writes_ledger_log_and_message(self):
        resp = self.client.post(reverse("panel:points_grant"), {
            "phone": self.target.phone,
            "amount": 500,
            "direction": "add",
            "reason": "活动奖励",
        })
        self.assertRedirects(resp, reverse("panel:points_grant"))
        self.target.refresh_from_db()
        self.assertEqual(self.target.points, 600)

        ledger = self.target.point_ledgers.get(type=PointLedger.Type.GRANT)
        self.assertEqual(ledger.change, 500)
        self.assertEqual(ledger.operator, self.admin)
        self.assertTrue(
            AdminLog.objects.filter(
                module=AdminLog.Module.POINTS, action=AdminLog.Action.GRANT
            ).exists()
        )
        self.assertTrue(self.target.messages.exists())

    def test_deduct_more_than_balance_rejected(self):
        self.client.post(reverse("panel:points_grant"), {
            "phone": self.target.phone,
            "amount": 9999,
            "direction": "sub",
            "reason": "测试扣减",
        })
        self.target.refresh_from_db()
        self.assertEqual(self.target.points, 100)


class ReviewOrderTests(TestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_login(self.admin)
        self.user = User.objects.create_user(phone="13800000040")
        self.order = Order.objects.create(
            user=self.user,
            type=Order.Type.COURSE_CONSULTING,
            contact_name="李四",
            phone="13800000040",
            description="课程咨询",
        )

    def test_approve_order(self):
        self.client.post(reverse("panel:order_review", args=[self.order.pk]), {
            "decision": "approved", "note": "资料齐全",
        })
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.APPROVED)
        self.assertEqual(self.order.reviewer, self.admin)
        self.assertTrue(self.user.messages.filter(title__contains="通过").exists())

    def test_reject_requires_note(self):
        self.client.post(reverse("panel:order_review", args=[self.order.pk]), {
            "decision": "rejected", "note": "",
        })
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PENDING)

    def test_consultant_can_review(self):
        consultant = make_admin(role=User.Role.CONSULTANT, phone="13800000041")
        self.client.force_login(consultant)
        self.client.post(reverse("panel:order_review", args=[self.order.pk]), {
            "decision": "approved", "note": "",
        })
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.APPROVED)


class CourseManageTests(TestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_login(self.admin)

    def test_create_and_toggle_course(self):
        resp = self.client.post(reverse("panel:course_create"), {
            "title": "新课程",
            "category": "fist_forms",
            "desc": "", "content": "", "cover": "", "teacher": "",
            "price": "0", "points_cost": "100", "tags": "",
            "lesson_count": "0", "sort_order": "50", "status": "draft",
        })
        self.assertRedirects(resp, reverse("panel:course_list"))
        course = Course.objects.get(title="新课程")
        self.assertTrue(course.course_id.startswith("CRS"))

        self.client.post(reverse("panel:course_toggle", args=[course.pk]))
        course.refresh_from_db()
        self.assertEqual(course.status, Course.Status.PUBLISHED)


class RolePermissionTests(TestCase):
    def test_consultant_cannot_access_points_grant(self):
        consultant = make_admin(role=User.Role.CONSULTANT, phone="13800000050")
        self.client.force_login(consultant)
        resp = self.client.get(reverse("panel:points_grant"))
        # 咨询师无积分管理权限,被重定向回登录页(登录页再跳回看板)
        self.assertRedirects(resp, reverse("panel:login"), target_status_code=302)

    def test_admin_cannot_change_role(self):
        admin = make_admin()
        target = User.objects.create_user(phone="13800000051")
        self.client.force_login(admin)
        self.client.post(reverse("panel:user_edit", args=[target.pk]), {
            "nickname": "test", "role": "admin", "status": "active",
        })
        target.refresh_from_db()
        self.assertEqual(target.role, User.Role.CLIENT)

    def test_superadmin_can_change_role(self):
        superadmin = make_admin(role=User.Role.SUPER_ADMIN, phone="13800000052")
        target = User.objects.create_user(phone="13800000053")
        self.client.force_login(superadmin)
        self.client.post(reverse("panel:user_edit", args=[target.pk]), {
            "nickname": "test", "role": "admin", "status": "active",
        })
        target.refresh_from_db()
        self.assertEqual(target.role, User.Role.ADMIN)


class ExchangeProcessTests(TestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_login(self.admin)
        self.user = User.objects.create_user(phone="13800000060", points=1000)

    def test_cancel_exchange_refunds_points(self):
        change_points(self.user, -800, PointLedger.Type.EXCHANGE, "兑换商品")
        exchange = PointExchange.objects.create(
            user=self.user, item_title="练功服", points_cost=800,
        )
        self.client.post(
            reverse("panel:exchange_process", args=[exchange.pk]),
            {"action": "cancel"},
        )
        exchange.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(exchange.status, PointExchange.Status.CANCELLED)
        self.assertEqual(self.user.points, 1000)
