"""H5 端表单。"""
from django import forms

from apps.orders.models import Order


class SendCodeForm(forms.Form):
    phone = forms.RegexField(
        regex=r"^1\d{10}$",
        error_messages={"invalid": "请输入正确的手机号"},
    )


class LoginForm(forms.Form):
    phone = forms.RegexField(
        regex=r"^1\d{10}$",
        error_messages={"invalid": "请输入正确的手机号"},
    )
    code = forms.CharField(min_length=4, max_length=6, error_messages={
        "required": "请输入验证码",
        "min_length": "验证码格式不正确",
    })
    invite_code = forms.CharField(required=False)


class ProfileForm(forms.Form):
    nickname = forms.CharField(max_length=64, required=False)
    avatar = forms.URLField(required=False)


class OrderForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ["type", "contact_name", "phone", "description"]
        error_messages = {
            "contact_name": {"required": "请填写联系人"},
            "phone": {"required": "请填写联系电话"},
            "description": {"required": "请填写需求描述"},
        }
