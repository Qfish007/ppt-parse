// 临时调试脚本：dump 百度汉语项目词条 HTML 到 /tmp 便于分析页面结构
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  const words = process.argv.slice(2).length ? process.argv.slice(2) : ['项目', '苹果', '快乐'];
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--mute-audio']
  });

  for (const word of words) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const url = `https://hanyu.baidu.com/hanyu-page/term/detail?wd=${encodeURIComponent(word)}&device=pc&from=home`;
    console.log(`\n========= ${word} =========`);
    console.log(`URL: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await Promise.race([
      page.waitForSelector('.pinyin-box .name', { timeout: 8000 }).catch(() => {}),
      page.waitForSelector('.pinyin-text', { timeout: 8000 }).catch(() => {}),
      page.waitForSelector('.idiom-container, .idiom-box, .definition-box, [class*="pinyin"]', { timeout: 8000 }).catch(() => {})
    ]);
    await new Promise(r => setTimeout(r, 1500));

    // 输出所有区块标题和内容
    const summary = await page.evaluate(() => {
      const getText = (el) => (el?.textContent || '').trim().replace(/\s+/g, ' ');
      const result = {
        title: document.title,
        bodyHead: getText(document.body).slice(0, 400),
        allClasses: new Set(),
        sectionTitles: [],
        pinyinBox: null,
        word: getText(document.querySelector('.pinyin-box .name, .name.name-space')),
        pinyin: getText(document.querySelector('.pinyin-text'))
      };
      // 收集所有带 class 的 div（前 40 个）
      document.querySelectorAll('div[class]').forEach(el => {
        const c = el.className;
        if (typeof c === 'string') {
          c.split(/\s+/).forEach(x => result.allClasses.add(x));
        }
      });
      // 收集所有看起来像区块标题的元素
      document.querySelectorAll('.bar, .title, h2, h3, h4, .caption, [class*="title"], [class*="bar"]').forEach(el => {
        const t = getText(el).slice(0, 50);
        if (t && t.length < 30) result.sectionTitles.push({ cls: el.className, text: t });
      });
      result.allClasses = Array.from(result.allClasses).filter(c => /box|wrap|item|section|title|tab|pinyin|idiom|liju|word|cite|syn/i.test(c));
      return result;
    });
    console.log(JSON.stringify(summary, null, 2));

    // 把完整 HTML 保存到文件
    const html = await page.content();
    const safe = word.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    fs.writeFileSync(`/tmp/hanyu-${safe}.html`, html);
    console.log(`Saved HTML to /tmp/hanyu-${safe}.html (${html.length} bytes)`);

    await page.close();
  }

  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
