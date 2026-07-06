"""积分领域服务:统一处理积分变动,保证流水完整。"""
from django.db import transaction

from apps.users.models import User

from .models import PointLedger


class InsufficientPointsError(Exception):
    """积分余额不足。"""


@transaction.atomic
def change_points(user, change, ledger_type, title, ref_id="", operator=None):
    """
    原子地变更用户积分并写入流水。

    - change 为正数表示增加,负数表示扣减
    - 扣减时校验余额,不足则抛出 InsufficientPointsError
    - 返回创建的流水记录
    """
    locked = User.objects.select_for_update().get(pk=user.pk)
    new_balance = locked.points + change
    if new_balance < 0:
        raise InsufficientPointsError(
            f"积分余额不足:当前 {locked.points},需要 {-change}"
        )

    locked.points = new_balance
    update_fields = ["points"]
    if change > 0:
        locked.total_points += change
        update_fields.append("total_points")
    else:
        locked.used_points += -change
        update_fields.append("used_points")
    locked.save(update_fields=update_fields)

    # 同步内存中的对象,避免调用方拿到旧余额
    user.points = new_balance
    user.total_points = locked.total_points
    user.used_points = locked.used_points

    return PointLedger.objects.create(
        user=locked,
        type=ledger_type,
        change=change,
        title=title,
        balance_after=new_balance,
        ref_id=ref_id,
        operator=operator,
    )
