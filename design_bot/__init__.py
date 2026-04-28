"""Design Bot - AI 驱动的 UI/UX 设计智能助手 (本仓库复刻版).

复刻自 https://cnb.cool/cnbnn/ui-ux-pro-max (MIT)，提供独立的 CLI、HTTP API
和 GitHub Action 三种调用方式。
"""

from .core import search, search_stack, AVAILABLE_STACKS, CSV_CONFIG
from .design_system import (
    DesignSystemGenerator,
    generate_design_system,
    persist_design_system,
)
from .preview import generate_preview_html, generate_screenshot

__version__ = "0.1.0"
__all__ = [
    "search",
    "search_stack",
    "AVAILABLE_STACKS",
    "CSV_CONFIG",
    "DesignSystemGenerator",
    "generate_design_system",
    "persist_design_system",
    "generate_preview_html",
    "generate_screenshot",
]
