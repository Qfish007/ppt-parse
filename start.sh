#!/bin/bash
# 双语逐页朗读器 - 启动脚本 (Mac/Linux)
# 双击此文件或终端运行: bash start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js (https://nodejs.org)"
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: Node.js 版本需要 >= 18，当前版本: $(node -v 2>/dev/null)"
    echo "请升级 Node.js: https://nodejs.org"
    echo "按任意键退出..."
    read -n 1
    exit 1
fi

# 检查是否已构建
if [ ! -f "dist/index.html" ]; then
    echo "未找到构建产物，正在执行构建..."
    if ! command -v npm &> /dev/null; then
        echo "错误: 未找到 npm，无法构建"
        echo "按任意键退出..."
        read -n 1
        exit 1
    fi
    npm install --production=false 2>/dev/null
    npm run build
    if [ $? -ne 0 ]; then
        echo "构建失败，请检查错误信息"
        echo "按任意键退出..."
        read -n 1
        exit 1
    fi
    echo "构建完成!"
fi

PORT=${PORT:-4173}

echo ""
echo "正在启动双语逐页朗读器..."
echo "启动后浏览器将自动打开"
echo "如需停止，按 Ctrl+C"
echo ""

node server.mjs
