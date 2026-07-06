"""管理后台权限装饰器。"""
from functools import wraps

from django.shortcuts import redirect

from apps.users.models import User

# 可登录后台的角色
PANEL_ROLES = {User.Role.ADMIN, User.Role.SUPER_ADMIN, User.Role.CONSULTANT}
# 拥有管理权限的角色
ADMIN_ROLES = {User.Role.ADMIN, User.Role.SUPER_ADMIN}


def panel_required(roles=None):
    """要求登录且角色在允许列表内(默认管理员)。"""
    allowed = roles or ADMIN_ROLES

    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect("panel:login")
            if request.user.role not in allowed:
                return redirect("panel:login")
            return view(request, *args, **kwargs)

        return wrapper

    return decorator


def superadmin_required(view):
    """仅超级管理员可访问。"""
    return panel_required({User.Role.SUPER_ADMIN})(view)
