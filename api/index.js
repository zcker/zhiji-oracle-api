const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 辅助工具：日期清洗 ---
function cleanDateStr(dateInput) {
  try {
    if (!dateInput) {
      const now = new Date();
      return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    }
    let s = String(dateInput).trim();
    if (s.includes('T')) s = s.split('T')[0];
    if (s.includes(' ')) s = s.split(' ')[0];
    const parts = s.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return s;
  } catch (e) {
    return "2000-01-01";
  }
}

// --- 辅助工具：安全获取宫位 ---
function getPalaceData(astrolabe, palaceName) {
  try {
    const palace = astrolabe.palaces.find(p => p.name === palaceName);
    if (!palace) return { 主星: [], 辅星: [], 四化: [] };
    return {
      主星: palace.majorStars.map(s => s.name),
      辅星: palace.minorStars.map(s => s.name),
      四化: palace.mutagens || []
    };
  } catch (e) {
    return { 主星: [], 辅星: [], 四化: [] };
  }
}

app.get('/', (req, res) => {
  res.send('🔮 Oracle API is Running (V5.0 Fixed Horoscope)');
});

// --- API 1: 紫微斗数 (Ziwei) ---
app.post('/api/ziwei', (req, res) => {
  try {
    let { dateStr, gender, hour, timeIndex } = req.body;
    
    // 1. 准备参数
    const cleanDate = cleanDateStr(dateStr);
    let finalTimeIndex = 0;
    if (timeIndex !== undefined && timeIndex !== null) {
      finalTimeIndex = Number(timeIndex);
    } else if (hour !== undefined) {
      const h = Number(hour);
      if (h >= 23) finalTimeIndex = 12;
      else if (h < 1) finalTimeIndex = 0;
      else finalTimeIndex = Math.floor((h + 1) / 2);
    }
    const genderStr = gender === '女' ? '女' : '男';

    // 2. 核心排盘
    const astrolabe = astro.bySolar(cleanDate, finalTimeIndex, genderStr, true, 'zh-CN');

    // 3. 计算流年 (关键修复点！)
    let liunianStars = [];
    try {
      // 修复：必须传日期字符串，不能传年份数字！
      // 获取当前日期的字符串格式 "YYYY-MM-DD"
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
      
      const horoscopeObj = astrolabe.horoscope(todayStr); 
      liunianStars = getPalaceData(horoscopeObj, '命宫').主星;
    } catch (err) {
      console.error("流年计算失败，忽略:", err.message);
      liunianStars = ["(流年计算异常)"]; // 兜底，不让接口挂掉
    }

    // 4. 返回结果
    res.json({
      meta: {
        日期: cleanDate,
        时辰索引: finalTimeIndex,
        性别: genderStr,
        局数: astrolabe.fiveElementsClass,
        命主: astrolabe.lifeMaster,
        身主: astrolabe.bodyMaster
      },
      data: {
        命宫: getPalaceData(astrolabe, '命宫'),
        夫妻宫: getPalaceData(astrolabe, '夫妻宫'),
        事业宫: getPalaceData(astrolabe, '官禄宫'),
        财帛宫: getPalaceData(astrolabe, '财帛宫'),
        流年: liunianStars
      }
    });

  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ 
      error: "排盘失败", 
      details: error.message,
      stack: error.stack 
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