const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 辅助工具：获取当前日期的字符串 (YYYY-MM-DD) ---
// 修复 .split 报错的关键
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- 辅助工具：日期与时间清洗 ---
function parseInput(dateStr, hourInput, timeIndexInput) {
  let cleanDate = "2000-01-01";
  let finalHour = 12; // 默认午时
  
  try {
    // 1. 处理日期字符串
    if (dateStr) {
      // 移除 "T" 方便处理
      let s = String(dateStr).trim().replace('T', ' ');
      
      // 如果包含时间 (例如 "2024-02-10 14:30")，尝试提取小时
      if (s.includes(':')) {
        const parts = s.split(' '); // ["2024-02-10", "14:30"]
        cleanDate = parts[0];
        // 提取小时
        if (parts.length > 1) {
          const timePart = parts[1];
          finalHour = parseInt(timePart.split(':')[0], 10);
        }
      } else {
        cleanDate = s.split(' ')[0];
      }
    }

    // 2. 处理时辰 (优先级：timeIndex > hourInput > 从dateStr提取的hour)
    let finalTimeIndex = 0;
    
    if (timeIndexInput !== undefined && timeIndexInput !== null) {
      finalTimeIndex = Number(timeIndexInput);
    } else {
      // 如果外部显式传了 hour，覆盖自动提取的 hour
      if (hourInput !== undefined && hourInput !== null) {
        finalHour = Number(hourInput);
      }
      // 转换小时 -> 时辰索引
      if (finalHour >= 23) finalTimeIndex = 12;
      else if (finalHour < 1) finalTimeIndex = 0;
      else finalTimeIndex = Math.floor((finalHour + 1) / 2);
    }

    return { cleanDate, finalTimeIndex, debugHour: finalHour };

  } catch (e) {
    console.error("Parse Error:", e);
    return { cleanDate: "2000-01-01", finalTimeIndex: 6, debugHour: 12 };
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
  res.send('🔮 Oracle API is Running (V5.0 Auto-Time)');
});

// --- API 1: 紫微斗数 (Ziwei) ---
app.post('/api/ziwei', (req, res) => {
  try {
    const { dateStr, gender, hour, timeIndex } = req.body;
    
    // 1. 智能解析参数
    const { cleanDate, finalTimeIndex, debugHour } = parseInput(dateStr, hour, timeIndex);
    const genderStr = gender === '女' ? '女' : '男';

    console.log(`Ziwei Request: Date=${cleanDate}, Hour=${debugHour}, Idx=${finalTimeIndex}, Gender=${genderStr}`);

    // 2. 核心排盘
    const astrolabe = astro.bySolar(cleanDate, finalTimeIndex, genderStr, true, 'zh-CN');

    // 3. 计算流年 (已修复)
    let liunianStars = [];
    try {
      // 关键修复：传入 "YYYY-MM-DD" 字符串，而不是数字
      const todayStr = getTodayStr();
      const horoscopeObj = astrolabe.horoscope(todayStr); 
      liunianStars = getPalaceData(horoscopeObj, '命宫').主星;
    } catch (err) {
      console.error("流年计算失败:", err.message);
      liunianStars = ["(运势计算中)"]; 
    }

    // 4. 返回结果
    res.json({
      meta: {
        日期: cleanDate,
        判定小时: debugHour,
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
    console.error("API Error:", error);
    res.status(500).json({ error: "API Error", details: error.message, stack: error.stack });
  }
});

// --- API 2: 八字排盘 ---
app.post('/api/bazi', (req, res) => {
  try {
    const { dateStr, hour } = req.body;
    // 复用智能解析
    const { cleanDate, debugHour } = parseInput(dateStr, hour);
    
    const dateObj = new Date(cleanDate);
    
    const solar = Solar.fromYmdHms(
      dateObj.getFullYear(),
      dateObj.getMonth() + 1,
      dateObj.getDate(),
      debugHour, 0, 0
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