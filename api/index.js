const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 辅助工具 1：时辰自动转换 ---
function getZiweiTimeIndex(hour) {
  if (typeof hour !== 'number') return 0;
  if (hour >= 23) return 12;
  if (hour < 1) return 0;
  return Math.floor((hour + 1) / 2);
}

// --- 辅助工具 2：日期清洗 ---
function cleanDateStr(dateInput) {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  return String(dateInput).trim().split(' ')[0].split('T')[0];
}

// --- 辅助工具 3：安全获取宫位 (Critical Fix!) ---
// 修复 "Cannot read properties of undefined" 的关键
function getPalaceData(astrolabe, palaceName) {
  // 遍历查找，而不是直接调用 .palace()
  const palace = astrolabe.palaces.find(p => p.name === palaceName);
  if (!palace) return { 主星: [], 辅星: [], 四化: [] };
  
  return {
    主星: palace.majorStars.map(s => s.name),
    辅星: palace.minorStars.map(s => s.name),
    四化: palace.mutagens || []
  };
}

// --- 根路径测试 ---
app.get('/', (req, res) => {
  res.send('🔮 Oracle API is Running... (ZhiJi Backend V3.0)');
});

// --- API 1: 紫微斗数 (修复版) ---
app.post('/api/ziwei', (req, res) => {
  try {
    let { dateStr, gender, hour } = req.body;
    
    // 1. 数据清洗
    const cleanDate = cleanDateStr(dateStr);
    const timeIndex = getZiweiTimeIndex(Number(hour) || 0);
    const genderStr = gender === '女' ? '女' : '男';

    // 2. 排盘
    const astrolabe = astro.bySolar(cleanDate, timeIndex, genderStr, true, 'zh-CN');

    // 3. 构建返回 (使用 getPalaceData 安全获取)
    res.json({
      meta: {
        日期: cleanDate,
        时辰索引: timeIndex,
        性别: genderStr,
        局数: astrolabe.fiveElementsClass,
        命主: astrolabe.lifeMaster,
        身主: astrolabe.bodyMaster
      },
      data: {
        命宫: getPalaceData(astrolabe, '命宫'),
        夫妻宫: getPalaceData(astrolabe, '夫妻宫'),
        事业宫: getPalaceData(astrolabe, '官禄宫'), // iztro 叫官禄宫
        财帛宫: getPalaceData(astrolabe, '财帛宫'),
        // 流年特殊处理：先获取流年盘，再找命宫
        流年: getPalaceData(
          astrolabe.horoscope(new Date().getFullYear()), 
          '命宫'
        ).主星
      }
    });

  } catch (error) {
    console.error("Ziwei Error:", error);
    res.status(500).json({ 
      error: "排盘失败", 
      details: error.message 
    });
  }
});

// --- API 2: 八字排盘 ---
app.post('/api/bazi', (req, res) => {
  try {
    const { dateStr, hour } = req.body;
    const cleanDate = cleanDateStr(dateStr);
    const dateObj = new Date(cleanDate);
    const h = Number(hour) || 12;

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
        日主: bazi[2].substring(0, 1),
        纳音: lunar.getBaZiNaYin().join(' '),
        节气: lunar.getPrevJieQi().getName() + " -> " + lunar.getNextJieQi().getName()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;