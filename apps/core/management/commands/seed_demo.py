"""初始化演示数据:管理员账号、课程、文章、视频、兑换商品等。"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.content.models import Article, Video
from apps.courses.models import Chapter, Course
from apps.points.models import ExchangeItem
from apps.services.models import Service
from apps.users.models import User


class Command(BaseCommand):
    help = "初始化鹿功汇演示数据(幂等,可重复执行)"

    def handle(self, *args, **options):
        self._create_admin()
        self._create_courses()
        self._create_articles()
        self._create_videos()
        self._create_services()
        self._create_exchange_items()
        self.stdout.write(self.style.SUCCESS("演示数据初始化完成"))

    def _create_admin(self):
        admin, created = User.objects.get_or_create(
            phone="13800000001",
            defaults={
                "username": "13800000001",
                "nickname": "平台超管",
                "role": User.Role.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin123456")
            admin.save()
            self.stdout.write("创建超级管理员: 13800000001 / admin123456")

        operator, created = User.objects.get_or_create(
            phone="13800000002",
            defaults={
                "username": "13800000002",
                "nickname": "运营管理员",
                "role": User.Role.ADMIN,
            },
        )
        if created:
            operator.set_password("admin123456")
            operator.save()
            self.stdout.write("创建运营管理员: 13800000002 / admin123456")

    def _create_courses(self):
        courses = [
            {
                "title": "太极拳入门十三式",
                "category": Course.Category.FIST_FORMS,
                "desc": "从零开始学习太极拳基础套路,掌握松、静、柔、缓的运动要领。",
                "teacher": "陈师傅",
                "points_cost": 300,
                "price": 3,
                "tags": "热门,新课",
                "chapters": ["起势与预备式", "野马分鬃", "白鹤亮翅", "搂膝拗步"],
            },
            {
                "title": "八段锦养生功法",
                "category": Course.Category.WELLNESS,
                "desc": "传统导引养生功法,调理气血、强健筋骨,适合各年龄段修习。",
                "teacher": "李师傅",
                "points_cost": 200,
                "price": 2,
                "tags": "推荐",
                "chapters": ["两手托天理三焦", "左右开弓似射雕", "调理脾胃须单举"],
            },
            {
                "title": "内功心法基础:呼吸与站桩",
                "category": Course.Category.INTERNAL_ARTS,
                "desc": "以站桩为门径,讲解丹田呼吸与意念导引的基本方法。",
                "teacher": "王师傅",
                "points_cost": 500,
                "price": 5,
                "tags": "进阶",
                "chapters": ["站桩姿势详解", "呼吸吐纳入门", "意守丹田要诀"],
            },
            {
                "title": "剑术基础:持剑与入门剑法",
                "category": Course.Category.WEAPONS,
                "desc": "学习持剑礼仪、基本剑法与入门套路,感受器械之美。",
                "teacher": "赵师傅",
                "points_cost": 400,
                "price": 4,
                "tags": "器械",
                "chapters": ["持剑礼仪", "刺、劈、撩基础剑法"],
            },
            {
                "title": "武道哲学:止戈为武",
                "category": Course.Category.PHILOSOPHY,
                "desc": "从武学经典出发,探讨武德修养与东方哲学智慧。",
                "teacher": "何教授",
                "points_cost": 100,
                "price": 1,
                "tags": "文化",
                "chapters": ["武之本义", "武德与修身"],
            },
        ]
        for index, data in enumerate(courses):
            chapters = data.pop("chapters")
            course, created = Course.objects.get_or_create(
                title=data["title"],
                defaults={
                    **data,
                    "status": Course.Status.PUBLISHED,
                    "sort_order": 100 - index,
                    "lesson_count": len(chapters),
                },
            )
            if created:
                for i, chapter_title in enumerate(chapters, start=1):
                    Chapter.objects.create(
                        course=course,
                        title=chapter_title,
                        sort_order=i,
                        is_free=(i == 1),
                        duration="15:00",
                    )
        self.stdout.write(f"课程总数: {Course.objects.count()}")

    def _create_articles(self):
        articles = [
            ("传统武术的当代价值", "武术不仅是技击之术,更是修身养性的文化载体。",
             "传统武术承载着中华民族数千年的身体智慧与哲学思考。在当代社会,武术的价值早已超越技击本身……"),
            ("初学者如何选择适合自己的拳种", "从身体条件、兴趣与目标出发,找到属于你的武学之路。",
             "面对琳琅满目的拳种流派,初学者常常无从下手。本文从养生、技击、文化三个维度给出建议……"),
            ("站桩三年,我的身体发生了什么变化", "一位普通修习者的真实记录。",
             "三年前我开始每天站桩三十分钟。从最初的腿酸手麻,到如今的气定神闲,这条路教会我的不只是功夫……"),
        ]
        for title, summary, content in articles:
            Article.objects.get_or_create(
                title=title,
                defaults={
                    "summary": summary,
                    "content": content,
                    "author": "鹿功汇编辑部",
                    "status": Article.Status.PUBLISHED,
                    "published_at": timezone.now(),
                },
            )
        self.stdout.write(f"文章总数: {Article.objects.count()}")

    def _create_videos(self):
        videos = [
            ("陈氏太极拳老架一路完整演示", Video.Channel.HERITAGE, "名家演示,值得反复观摩"),
            ("八卦掌走圈基本功教学", Video.Channel.HERITAGE, "转掌如推磨,行步似趟泥"),
            ("武学短剧:师父的最后一课", Video.Channel.SHORT_DRAMA, "笑中带泪的武馆日常"),
            ("武学短剧:菜市场偶遇扫地僧", Video.Channel.SHORT_DRAMA, "高手在民间"),
            ("形意五行拳劈拳详解", Video.Channel.HERITAGE, "劈拳似斧,起钻落翻"),
        ]
        for index, (title, channel, desc) in enumerate(videos):
            Video.objects.get_or_create(
                title=title,
                defaults={
                    "channel": channel,
                    "desc": desc,
                    "status": Video.Status.PUBLISHED,
                    "sort_order": 100 - index,
                    "duration": "03:20",
                },
            )
        self.stdout.write(f"视频总数: {Video.objects.count()}")

    def _create_services(self):
        services = [
            ("一对一私教指导", "名师一对一线上指导,纠正动作细节", 199, 19900, "视频连线,动作纠正,训练计划"),
            ("武学修习年度会员", "全年课程畅学 + 专属社群", 365, 36500, "全部课程,专属社群,线下活动优先"),
        ]
        for name, desc, price, points, features in services:
            Service.objects.get_or_create(
                name=name,
                defaults={
                    "desc": desc,
                    "price": price,
                    "points_cost": points,
                    "features": features,
                    "status": Service.Status.ACTIVE,
                },
            )
        self.stdout.write(f"服务总数: {Service.objects.count()}")

    def _create_exchange_items(self):
        items = [
            ("VIP 会员 30 天", "兑换后立即生效,可叠加续期", 1000, True, 30),
            ("鹿功汇定制练功服", "透气棉麻材质,舒适耐穿", 5000, False, 0),
            ("线下工作坊体验券", "可用于任意一场线下工作坊", 2000, False, 0),
        ]
        for title, desc, points, is_vip, vip_days in items:
            ExchangeItem.objects.get_or_create(
                title=title,
                defaults={
                    "desc": desc,
                    "points_cost": points,
                    "is_vip": is_vip,
                    "vip_days": vip_days,
                    "status": ExchangeItem.Status.ACTIVE,
                },
            )
        self.stdout.write(f"兑换商品总数: {ExchangeItem.objects.count()}")
