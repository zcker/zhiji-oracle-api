const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 根路径测试 ---
app.get('/', (req, res) => {
  res.send('🔮 Oracle API is Running... (ZhiJi Backend)');
});

// --- 辅助函数：根据中文名获取主星 ---
// 解决 iztro 不支持直接通过中文名 .palace('命宫') 获取的问题
function getPalaceStars(astrolabeObj, palaceName) {
  // 遍历所有宫位，找到名字匹配的那个
  const palace = astrolabeObj.palaces.find(p => p.name === palaceName);
  // 如果找到了，返回主星名字数组；没找到返回空
  return palace ? palace.majorStars.map(s => s.name) : [];
}

// --- API 1: 紫微斗数 (Ziwei) ---
app.post('/api/ziwei', (req, res) => {
  try {
    const { dateStr, gender, timeIndex } = req.body;
    // dateStr: "2023-01-15 12:30"
    // gender: "男" 或 "女"
    // timeIndex: 时辰索引 0-12

    const astrolabe = astro.bySolar(dateStr, timeIndex || 0, gender, true, 'zh-CN');

    // 修复点：使用辅助函数 getPalaceStars 来安全获取数据
    res.json({
      message: "紫微排盘成功",
      data: {
        命宫: getPalaceStars(astrolabe, '命宫'),
        夫妻宫: getPalaceStars(astrolabe, '夫妻宫'),
        事业宫: getPalaceStars(astrolabe, '官禄宫'), // 注意：iztro里叫官禄宫
        财帛宫: getPalaceStars(astrolabe, '财帛宫'),
        // 获取流年运势
        流年运势: getPalaceStars(astrolabe.horoscope(new Date(dateStr).getFullYear()), '命宫')
      }
    });
  } catch (error) {
    console.error(error); // 在后台打印详细错误
    res.status(500).json({ error: error.message });
  }
});

// --- API 2: 八字排盘 (Bazi) ---
app.post('/api/bazi', (req, res) => {
  try {
    const { dateStr } = req.body; 
    const date = new Date(dateStr);
    
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
        八字: bazi.join(' '), 
        五行: lunar.getBaZiWuXing().join(' '),
        日主: bazi[2].substring(0, 1), 
        冲煞: "此处可扩展计算冲煞逻辑"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;