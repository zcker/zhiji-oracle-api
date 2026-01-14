// index.js
const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 根路径测试 ---
app.get('/', (req, res) => {
  res.send('🔮 Oracle API is Running... (ZhiJi Backend)');
});

// --- API 1: 紫微斗数 (Ziwei) ---
// 文档参考: iztro
app.post('/api/ziwei', (req, res) => {
  try {
    const { dateStr, gender, timeIndex } = req.body;
    // dateStr: "2023-01-15 12:30" (阳历)
    // gender: "男" 或 "女"
    // timeIndex: 时辰索引 (0-12)，如果不传，代码里通过时间自动算也行，这里简化处理直接传

    // 简单的时辰映射 (0=早子, 1=丑, ... 12=晚子)
    // 如果 Dify 传过来的是具体时间，可以用 iztro 的 bySolar 自动处理
    // 这里假设 Dify 传标准的 "2023-01-15 12:00"

    const astrolabe = astro.bySolar(dateStr, timeIndex || 0, gender, true, 'zh-CN');

    res.json({
      message: "紫微排盘成功",
      data: {
        命宫: astrolabe.palace('命宫').majorStars.map(s => s.name),
        夫妻宫: astrolabe.palace('夫妻宫').majorStars.map(s => s.name),
        事业宫: astrolabe.palace('官禄宫').majorStars.map(s => s.name),
        财帛宫: astrolabe.palace('财帛宫').majorStars.map(s => s.name),
        流年运势: astrolabe.horoscope(new Date(dateStr).getFullYear()).palace('命宫').majorStars.map(s => s.name)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API 2: 八字排盘 (Bazi) ---
// 文档参考: lunar-javascript
app.post('/api/bazi', (req, res) => {
  try {
    const { dateStr } = req.body; 
    // dateStr: "2023-01-15 12:00"

    const date = new Date(dateStr);
    // 构建 Solar 对象
    const solar = Solar.fromYmdHms(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      0
    );

    const lunar = solar.getLunar();
    const bazi = lunar.getBaZi();

    res.json({
      message: "八字排盘成功",
      data: {
        八字: bazi.join(' '), // 甲子 乙丑 ...
        五行: lunar.getBaZiWuXing().join(' '),
        日主: bazi[2].substring(0, 1), // 日干，用于判断身强身弱的核心
        冲煞: "此处可扩展计算冲煞逻辑"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vercel 导出配置 (关键！)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;