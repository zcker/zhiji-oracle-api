const express = require('express');
const { astro } = require('iztro');
const { Solar, Lunar } = require('lunar-javascript');

const app = express();
app.use(express.json());

// --- 辅助工具：日期清洗 (暴力修正版) ---
function cleanDateStr(dateInput) {
  try {
    if (!dateInput) {
      const now = new Date();
      return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    }
    // 强制转字符串，移除时间部分，移除空格
    let s = String(dateInput).trim();
    if (s.includes('T')) s = s.split('T')[0];
    if (s.includes(' ')) s = s.split(' ')[0];
    // 确保格式为 YYYY-MM-DD (例如 2024-2-1 -> 2024-02-01)
    const parts = s.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return s;
  } catch (e) {
    return "2000-01-01"; // 兜底日期
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

// --- 根路径 ---
app.get('/', (req, res) => {
  res.send('🔮 Oracle API is Running (V4.0 Debug Mode)');
});

// --- 调试接口 (新) ---
// 访问 /api/debug 看看 iztro 到底能不能工作
app.get('/api/debug', (req, res) => {
  try {
    const astrolabe = astro.bySolar("2024-01-01", 0, "男", true, "zh-CN");
    res.json({ status: "ok", demo: astrolabe.palace('命宫').majorStars[0].name });
  } catch (e) {
    res.json({ status: "error", msg: e.message });
  }
});

// --- API 1: 紫微斗数 (Ziwei) ---
app.post('/api/ziwei', (req, res) => {
  try {
    // 兼容 hour (Dify习惯) 和 timeIndex (测试脚本习惯)
    let { dateStr, gender, hour, timeIndex } = req.body;
    
    // 1. 强力清洗日期
    const cleanDate = cleanDateStr(dateStr);
    
    // 2. 计算时辰索引 (0-12)
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

    console.log(`Debug Input: Date=${cleanDate}, TimeIdx=${finalTimeIndex}, Gender=${genderStr}`);

    // 3. 排盘
    const astrolabe = astro.bySolar(cleanDate, finalTimeIndex, genderStr, true, 'zh-CN');

    // 4. 构建返回
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
        流年: getPalaceData(
          astrolabe.horoscope(new Date().getFullYear()), 
          '命宫'
        ).主星
      }
    });

  } catch (error) {
    console.error("Critical Error:", error);
    res.status(500).json({ 
      error: "排盘失败", 
      details: error.message,
      stack: error.stack // 打印堆栈以便调试
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