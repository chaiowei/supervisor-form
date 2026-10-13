const d = $('Prepare Data').first().json;
const lang = d.language || 'en';
let dZH = { ...d, weekday: d.weekdayZH };
let geminiStatus;
if (lang === 'zh') {
  // Source form was already filled in Chinese — never call/trust Gemini for
  // this case (per Jerry's requirement), so a model hiccup can't corrupt
  // already-correct Chinese text. The 'Is ZH Source?' IF node upstream
  // skipped the Gemini HTTP call entirely for this path.
  geminiStatus = 'success';
} else {
  const gemini = $input.first().json;
  geminiStatus = 'not_called';
  try {
    if (gemini && !gemini.error) {
      const rawText = gemini.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        let cleanText = rawText;
        if (cleanText.trimStart().startsWith('```')) {
          cleanText = cleanText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        }
        const translated = JSON.parse(cleanText.trim());
        if (translated && typeof translated === 'object' && Object.keys(translated).length > 0) {
          dZH = { ...d, ...translated, weekday: d.weekdayZH };
          geminiStatus = 'success';
        } else {
          geminiStatus = 'empty_json';
        }
      } else {
        geminiStatus = 'no_text:' + JSON.stringify(Object.keys(gemini || {}).slice(0, 5));
      }
    } else {
      geminiStatus = 'gemini_error:' + String((gemini && (gemini.error || gemini.message)) || 'unknown').slice(0, 100);
    }
  } catch(e) {
    geminiStatus = 'parse_err:' + String(e.message || '').slice(0, 100);
  }
}
// Weather / hazardous-work labels are built once in Prepare Data
const lbC = (d.labels && d.labels.contractor) || {};
const lbZ = (d.labels && d.labels.zh) || {};
const dC = { ...d, mW: lbC.mW || '-', aW: lbC.aW || '-', hazard: lbC.hazard || '-', risk: lbC.risk || '' };
dZH = { ...dZH, mW: lbZ.mW || '-', aW: lbZ.aW || '-', hazard: lbZ.hazard || '-', risk: lbZ.risk || '' };
// Chinese PDF of a Thai/English report: show the original under the
// translation for the fields where a mistranslated quantity, size or spec
// matters most, so it can be checked against what the contractor wrote.
const ORIG_FIELDS = ['constructionItems', 'materialsUsed', 'equipment', 'samplingTests', 'qualityInspection'];
const origZH = (lang !== 'zh' && geminiStatus === 'success') ? d : null;
const LBL = {
  en: { title: 'Work Daily Report', projectName: 'Project Name', constructionArea: 'Construction Area', date: 'Date', weekday: 'Day', weather: 'Weather', morning: 'AM', afternoon: 'PM', time: 'Filled In', hazard: 'Hazardous Work', late: 'Late entry', orig: 'Original', constructionLocation: 'Construction Location', workContent: 'Work Content', constructionItems: 'Construction Items (Today)', tomorrowPlan: "Tomorrow's Plan", materialsUsed: 'Materials Used', equipment: 'Equipment Used', workers: 'Workers', persons: '', communication: 'Contractor Communication', otherNotes: 'Other Notes', samplingTests: 'Sampling & Testing Records', qualityInspection: 'Quality & Qty Inspection', supervisor: 'Unit Supervisor', inspector: 'Inspector', genLabel: 'Filled in' },
  th: { title: 'บันทึกงานประจำวัน', projectName: 'ชื่อโครงการ', constructionArea: 'พื้นที่ก่อสร้าง', date: 'วันที่', weekday: 'วัน', weather: 'สภาพอากาศ', morning: 'เช้า', afternoon: 'บ่าย', time: 'เวลาที่กรอก', hazard: 'งานอันตราย', late: 'บันทึกย้อนหลัง', orig: 'ต้นฉบับ', constructionLocation: 'ตำแหน่งก่อสร้าง', workContent: 'เนื้อหางาน', constructionItems: 'รายการงาน (วันนี้)', tomorrowPlan: 'แผนงานพรุ่งนี้', materialsUsed: 'วัสดุที่ใช้', equipment: 'เครื่องมือ', workers: 'จำนวนคน', persons: 'คน', communication: 'การสื่อสารกับผู้รับเหมา', otherNotes: 'หมายเหตุสำคัญ', samplingTests: 'การเก็บตัวอย่าง', qualityInspection: 'การตรวจสอบคุณภาพ', supervisor: 'ผู้จัดการ', inspector: 'ผู้ตรวจสอบ', genLabel: 'กรอกเมื่อ' },
  zh: { title: '監工日誌', projectName: '工程名稱', constructionArea: '施工廠區', date: '日期', weekday: '星期', weather: '天氣', morning: '上午', afternoon: '下午', time: '填寫時間', hazard: '今日危險作業', late: '補填', orig: '原文', constructionLocation: '施工部位', workContent: '工作內容', constructionItems: '施工項目（今日）', tomorrowPlan: '明日預計工作', materialsUsed: '供給材料使用', equipment: '機具使用', workers: '出工人數', persons: '人', communication: '與廠商溝通協調記錄', otherNotes: '其他重要事項記錄', samplingTests: '施工取樣試驗記錄', qualityInspection: '品質、數量檢查記錄', supervisor: '單位主管', inspector: '負責工程師', genLabel: '填寫時間' }
};
const L = LBL[lang] || LBL.en;
const LZH = LBL.zh;
const photoUrls = d.photoUrls || [];
const esc = s => String(s || '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let photoHtml = '';
if (photoUrls.length > 0) {
  for (let i = 0; i < photoUrls.length; i += 4) {
    const chunk = photoUrls.slice(i, i + 4);
    const cells = chunk.map(url => `<td style='width:50%;padding:4px'><img src='${url}' style='width:100%;height:auto'></td>`);
    while (cells.length < 4) cells.push(`<td style='width:50%;padding:4px'></td>`);
    photoHtml += `<table style='width:100%;border-collapse:collapse;margin-top:8px;page-break-inside:avoid'><tr>${cells.slice(0,2).join('')}</tr><tr>${cells.slice(2,4).join('')}</tr></table>`;
  }
}
function buildHtml(Lb, data, genStamp, orig) {
  // Field text, plus the original-language text under it when it differs
  const fx = key => {
    const o = orig && String(orig[key] || '').trim();
    const note = (o && ORIG_FIELDS.includes(key) && o !== String(data[key] || '').trim())
      ? `<div class='orig'>${Lb.orig}: ${esc(o)}</div>` : '';
    return esc(data[key]) + note;
  };
  const hazardCell = data.risk
    ? `<td colspan='3' style='color:#c53030;font-weight:bold'>⚠️ ${esc(data.hazard)}</td>`
    : `<td colspan='3'>${esc(data.hazard)}</td>`;
  const timeCell = esc(data.filledAtShort || data.submitTime) + (data.lateEntry ? ` <b style='color:#a05a00'>(${Lb.late})</b>` : '');
  return `<!DOCTYPE html><html><head><meta charset='UTF-8'><style>body{font-family:Arial,'Noto Sans Thai',sans-serif;font-size:10pt;margin:0}.t{text-align:center;font-weight:bold;margin-bottom:4px}table.m{width:100%;border-collapse:collapse}table.m td{border:1px solid #333;padding:4px 6px;vertical-align:top}.sh{background:#ddd;font-weight:bold;text-align:center}.c{min-height:40px;white-space:pre-wrap}.gen-stamp{position:fixed;bottom:6mm;right:8mm;font-size:8pt;color:#aaaaaa}.orig{margin-top:4px;padding-top:3px;border-top:1px dashed #bbb;color:#666;font-size:8.5pt;white-space:pre-wrap}</style></head><body><div class='gen-stamp'>${Lb.genLabel}: ${genStamp}</div><div class='t' style='font-size:14pt'>ECO INFINIC</div><div class='t' style='font-size:12pt;margin-bottom:8px'>${Lb.title}</div><table class='m'><tr><td style='width:12%'><b>${Lb.projectName}</b></td><td style='width:38%'>${esc(data.projectName)}</td><td style='width:12%'><b>${Lb.constructionArea}</b></td><td style='width:38%'>${esc(data.constructionArea)}</td></tr><tr><td><b>${Lb.date}</b></td><td>${esc(data.date)}</td><td><b>${Lb.weekday}</b></td><td>${esc(data.weekday)}</td></tr><tr><td><b>${Lb.weather}</b></td><td colspan='3'>${Lb.morning}: ${esc(data.mW)} / ${Lb.afternoon}: ${esc(data.aW)}</td></tr><tr><td><b>${Lb.hazard}</b></td>${hazardCell}</tr><tr><td><b>${Lb.time}</b></td><td colspan='3'>${timeCell}</td></tr><tr><td class='sh' colspan='4'>${Lb.constructionLocation}</td></tr><tr><td colspan='4' class='c'>${esc(data.constructionLocation)}</td></tr><tr><td class='sh' colspan='4'>${Lb.workContent}</td></tr><tr><td><b>${Lb.constructionItems}</b></td><td colspan='3' class='c' style='min-height:60px'>${fx('constructionItems')}</td></tr><tr><td><b>${Lb.tomorrowPlan}</b></td><td colspan='3' class='c' style='min-height:50px'>${fx('tomorrowPlan')}</td></tr><tr><td><b>${Lb.materialsUsed}</b></td><td>${fx('materialsUsed')}</td><td><b>${Lb.equipment}</b></td><td>${fx('equipment')}</td></tr><tr><td><b>${Lb.workers}</b></td><td colspan='3'>${esc(data.workers)} ${Lb.persons}</td></tr><tr><td class='sh' colspan='4'>${Lb.communication}</td></tr><tr><td colspan='4' class='c'>${esc(data.communication)}</td></tr><tr><td class='sh' colspan='4'>${Lb.otherNotes}</td></tr><tr><td colspan='4' class='c'>${esc(data.otherNotes)}</td></tr><tr><td colspan='2'><b>${Lb.samplingTests}</b></td><td colspan='2'><b>${Lb.qualityInspection}</b></td></tr><tr><td colspan='2' class='c'>${fx('samplingTests')}</td><td colspan='2' class='c'>${fx('qualityInspection')}</td></tr><tr><td><b>${Lb.supervisor}</b></td><td></td><td><b>${Lb.inspector}</b></td><td>${esc(data.supervisor)}</td></tr></table>${photoHtml}</body></html>`;
}
// Phone-local fill-in time from Prepare Data (not this server's clock)
const genStamp = d.filledAtShort || d.submitTime || '';
const html = buildHtml(L, dC, genStamp, null);
let htmlZH = buildHtml(LZH, dZH, genStamp, origZH);
if (geminiStatus !== 'success') {
  const warnBanner = "<div style='background:#fee2e2;border:2px solid #e53e3e;color:#991b1b;padding:8px 12px;margin-bottom:8px;font-weight:bold;font-size:11pt'>⚠️ 自動翻譯失敗，以下內容為原文（非正式中文翻譯），請人工確認 / Translation failed — content below is original language</div>";
  htmlZH = htmlZH.replace('<body>', '<body>' + warnBanner);
}
const variants = [
  { lang: 'contractor', html: html, fileName: d.fileName },
  { lang: 'zh', html: htmlZH, fileName: d.fileName.replace('.pdf', '_ZH.pdf') }
];
return [{ json: { ...d, pdfHtml: html, pdfHtmlZH: htmlZH, translatedZH: dZH, geminiStatus, variants } }];
