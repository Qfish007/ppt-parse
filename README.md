# 双语逐页朗读器

推荐运行本地服务后使用：

```bash
node server.mjs
```

然后打开 `http://localhost:4173`。直接打开 `index.html` 仍可朗读和编辑。

它支持：

- 每页多行英文，英文下方显示中文
- 点击任意英文单词单独朗读
- 可选择有道或百度作为发音平台
- 可选显示每页图片
- 从外研社翻页课件下载页图并进行英文 OCR

JSON 格式如下：

```json
{
  "title": "我的材料",
  "pages": [
    {
      "page": 1,
      "image": "./images/page-001.webp",
      "lines": [
        {
          "en": "Good morning, everyone.",
          "zh": "大家早上好。"
        }
      ]
    }
  ]
}
```

请只导入你拥有使用权或授权的文本与图片。

## 生成课件内容

先下载阅读器配置：

```bash
curl -sS -L --connect-timeout 10 --max-time 30 https://www.fltrp.com/ebook/jcjycpzx/xbz-xxxjdb-1/javascript/config.js -o config.js
```

再运行 OCR：

```bash
node scripts/download-and-ocr.mjs
```

脚本会生成：

- `images/`：97 页图片
- `ocr/`：每页 OCR TSV
- `content.generated.js`：网页直接读取的数据

当前机器只有英文 OCR 语言包，所以脚本会自动识别英文行；中文对照可以在网页中直接点击空白处编辑，编辑结果会保存在浏览器本地。
