const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 辅助工具：时辰自动转换 ---
// 将 0-23 的小时数转换为紫微斗数的 timeIndex (0-12)
function getZiweiTimeIndex(hour) {
  if (typeof hour !== 'number') return 0; // 默认早子时
  if (hour >= 23) return 12; // 晚子时 (23:00-24:00)
  if (hour < 1) return 0;    // 早子时 (00:00-01:00)
  return Math.floor((hour + 1) / 2);
}

// --- 辅助工具：日期清洗 ---
// 解决 date.split is not a function 报错
function cleanDateStr(dateInput) {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  // 强制转为字符串并切割
  return String(dateInput).trim().split(' ')[0].split('T')[0];
}

// --- 根路径测试 ---
app.get('/', (req, res) => {
  res.send('🔮 Oracle API is Running... (Modified from MCPIztro)');
});

// --- API 1: 紫微斗数 (Pro版) ---
app.post('/api/ziwei', (req, res) => {
  try {
    let { dateStr, gender, hour } = req.body;
    
    // 1. 数据清洗
    const cleanDate = cleanDateStr(dateStr);
    const timeIndex = getZiweiTimeIndex(Number(hour) || 0); // 自动处理小时
    const genderStr = gender === '女' ? '女' : '男';

    // 2. 调用 iztro 排盘
    const astrolabe = astro.bySolar(cleanDate, timeIndex, genderStr, true, 'zh-CN');

    // 3. 构建类似 MCPIztro 的丰富返回
    res.json({
      meta: {
        日期: cleanDate,
        时辰索引: timeIndex,
        性别: genderStr,
        局数: astrolabe.fiveElementsClass, // 五行局
        命主: astrolabe.lifeMaster,
        身主: astrolabe.bodyMaster
      },
      // 核心宫位数据
      data: {
        命宫: {
          主星: astrolabe.palace('命宫').majorStars.map(s => s.name),
          辅星: astrolabe.palace('命宫').minorStars.map(s => s.name),
          四化: astrolabe.palace('命宫').mutagens || []
        },
        夫妻宫: {
          主星: astrolabe.palace('夫妻宫').majorStars.map(s => s.name),
          辅星: astrolabe.palace('夫妻宫').minorStars.map(s => s.name)
        },
        事业宫: { // iztro 内部叫官禄宫
          主星: astrolabe.palace('官禄宫').majorStars.map(s => s.name),
          辅星: astrolabe.palace('官禄宫').minorStars.map(s => s.name)
        },
        财帛宫: {
          主星: astrolabe.palace('财帛宫').majorStars.map(s => s.name),
          辅星: astrolabe.palace('财帛宫').minorStars.map(s => s.name)
        },
        // 增加流年运势
        流年: astrolabe.horoscope(new Date().getFullYear()).palace('命宫').majorStars.map(s => s.name)
      }
    });

  } catch (error) {
    console.error("Ziwei Error:", error);
    res.status(500).json({ 
      error: "排盘失败", 
      details: error.message,
      tip: "请检查日期格式是否为 YYYY-MM-DD" 
    });
  }
});

// --- API 2: 八字排盘 (Bazi) ---
app.post('/api/bazi', (req, res) => {
  try {
    const { dateStr, hour } = req.body;
    const cleanDate = cleanDateStr(dateStr);
    const dateObj = new Date(cleanDate);
    const h = Number(hour) || 12; // 默认午时

    const solar = Solar.fromYmdHms(
      dateObj.getFullYear(),
      dateObj.getMonth() + 1,
      dateObj.getDate(),
      h, 0, 0
    );
    
    const lunar = solar.getLunar();
    const bazi = lunar.getBaZi();

    res.json({
      data: {
        八字: bazi.join(' '),
        五行: lunar.getBaZiWuXing().join(' '),
        日主: bazi[2].substring(0, 1), // 提取日干
        纳音: lunar.getBaZiNaYin().join(' '),
        节气: lunar.getPrevJieQi().getName() + " -> " + lunar.getNextJieQi().getName()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vercel Serverless 导出
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;