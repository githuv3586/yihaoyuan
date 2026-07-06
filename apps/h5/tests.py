"""H5 用户端核心流程测试。"""
from django.test import TestCase
from django.urls import reverse

from apps.content.models import Article, Video
from apps.courses.models import Course, Enrollment
from apps.points.models import ExchangeItem, PointLedger
from apps.users.models import User, VerificationCode


def latest_code(phone):
    """测试环境下从数据库读取最新验证码。"""
    return VerificationCode.objects.filter(phone=phone).latest("created_at").code


class AuthTests(TestCase):
    def test_send_code_and_login_creates_user_with_register_bonus(self):
        phone = "13912345678"
        resp = self.client.post(reverse("h5:send_code"), {"phone": phone})
        self.assertEqual(resp.status_code, 200)
        code = latest_code(phone)

        resp = self.client.post(reverse("h5:login"), {"phone": phone, "code": code})
        self.assertRedirects(resp, reverse("h5:home"))

        user = User.objects.get(phone=phone)
        self.assertEqual(user.points, 100)
        self.assertTrue(user.point_ledgers.filter(type=PointLedger.Type.REGISTER).exists())
        self.assertTrue(user.messages.exists())

    def test_login_with_wrong_code_fails(self):
        self.client.post(reverse("h5:send_code"), {"phone": "13912345678"})
        resp = self.client.post(
            reverse("h5:login"), {"phone": "13912345678", "code": "000000"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(User.objects.filter(phone="13912345678").exists())

    def test_invite_code_rewards_inviter(self):
        inviter = User.objects.create_user(phone="13800001111", nickname="师兄")
        self.client.post(reverse("h5:send_code"), {"phone": "13900002222"})
        code = latest_code("13900002222")
        self.client.post(reverse("h5:login"), {
            "phone": "13900002222", "code": code, "invite_code": inviter.invite_code,
        })
        inviter.refresh_from_db()
        self.assertEqual(inviter.points, 50)
        new_user = User.objects.get(phone="13900002222")
        self.assertEqual(new_user.invited_by, inviter)


class CourseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="13800009999", points=500)
        self.course = Course.objects.create(
            title="太极入门",
            category=Course.Category.FIST_FORMS,
            status=Course.Status.PUBLISHED,
            points_cost=300,
        )
        self.client.force_login(self.user)

    def test_course_list_and_detail(self):
        resp = self.client.get(reverse("h5:course_list"))
        self.assertContains(resp, "太极入门")
        resp = self.client.get(
            reverse("h5:course_detail", args=[self.course.course_id])
        )
        self.assertContains(resp, "太极入门")

    def test_enroll_deducts_points_and_writes_ledger(self):
        resp = self.client.post(
            reverse("h5:enroll_course", args=[self.course.course_id])
        )
        self.assertRedirects(
            resp, reverse("h5:course_detail", args=[self.course.course_id])
        )
        self.user.refresh_from_db()
        self.course.refresh_from_db()
        self.assertEqual(self.user.points, 200)
        self.assertEqual(self.course.enroll_count, 1)
        self.assertTrue(
            Enrollment.objects.filter(user=self.user, course=self.course).exists()
        )
        ledger = self.user.point_ledgers.get(type=PointLedger.Type.COURSE_ENROLL)
        self.assertEqual(ledger.change, -300)
        self.assertEqual(ledger.balance_after, 200)

    def test_enroll_with_insufficient_points_fails(self):
        self.user.points = 100
        self.user.save()
        self.client.post(reverse("h5:enroll_course", args=[self.course.course_id]))
        self.assertFalse(
            Enrollment.objects.filter(user=self.user, course=self.course).exists()
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.points, 100)

    def test_duplicate_enroll_is_noop(self):
        self.client.post(reverse("h5:enroll_course", args=[self.course.course_id]))
        self.client.post(reverse("h5:enroll_course", args=[self.course.course_id]))
        self.assertEqual(
            Enrollment.objects.filter(user=self.user, course=self.course).count(), 1
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.points, 200)


class ExchangeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="13800008888", points=2000)
        self.client.force_login(self.user)

    def test_vip_exchange_activates_vip(self):
        item = ExchangeItem.objects.create(
            title="VIP 30 天", points_cost=1000, is_vip=True, vip_days=30
        )
        self.client.post(reverse("h5:exchange_item", args=[item.pk]))
        self.user.refresh_from_db()
        self.assertEqual(self.user.points, 1000)
        self.assertTrue(self.user.is_vip)
        self.assertGreaterEqual(self.user.vip_days_left, 29)

    def test_exchange_insufficient_points(self):
        item = ExchangeItem.objects.create(title="大礼包", points_cost=99999)
        self.client.post(reverse("h5:exchange_item", args=[item.pk]))
        self.user.refresh_from_db()
        self.assertEqual(self.user.points, 2000)


class ContentTests(TestCase):
    def test_home_feed_shows_published_videos(self):
        Video.objects.create(title="太极演示", status=Video.Status.PUBLISHED)
        Video.objects.create(title="草稿视频", status=Video.Status.DRAFT)
        resp = self.client.get(reverse("h5:home"))
        self.assertContains(resp, "太极演示")
        self.assertNotContains(resp, "草稿视频")

    def test_article_detail_increments_view_count(self):
        article = Article.objects.create(
            title="武学文章", content="内容", status=Article.Status.PUBLISHED
        )
        self.client.get(reverse("h5:article_detail", args=[article.pk]))
        article.refresh_from_db()
        self.assertEqual(article.view_count, 1)


class OrderTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="13800007777")
        self.client.force_login(self.user)

    def test_create_order(self):
        resp = self.client.post(reverse("h5:order_create"), {
            "type": "course_consulting",
            "contact_name": "张三",
            "phone": "13800007777",
            "description": "想咨询太极课程",
        })
        self.assertRedirects(resp, reverse("h5:order_list"))
        order = self.user.orders.first()
        self.assertEqual(order.status, "pending")
        self.assertTrue(order.order_id.startswith("ORD"))
