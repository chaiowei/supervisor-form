// Two PDFs like the daily report: the filler's language + Chinese. There is
// no free text to translate here, so no Gemini step — only the labels differ.
const d = $('Prepare Data').first().json;
const lang = d.language || 'en';
const LBL = {
  en: { title: 'Site Photo Report', projectName: 'Project Name', constructionArea: 'Construction Area', date: 'Date', weekday: 'Day', contractor: 'Contractor', supervisor: 'Engineer', time: 'Filled In', photos: 'Photos', late: 'Late entry', genLabel: 'Filled in' },
  th: { title: 'รายงานรูปภาพหน้างาน', projectName: 'ชื่อโครงการ', constructionArea: 'พื้นที่ก่อสร้าง', date: 'วันที่', weekday: 'วัน', contractor: 'ผู้รับเหมา', supervisor: 'ผู้ควบคุมงาน', time: 'เวลาที่กรอก', photos: 'จำนวนรูป', late: 'บันทึกย้อนหลัง', genLabel: 'กรอกเมื่อ' },
  zh: { title: '現場照片回報', projectName: '工程名稱', constructionArea: '施工廠區', date: '日期', weekday: '星期', contractor: '施工廠商', supervisor: '負責工程師', time: '填寫時間', photos: '照片張數', late: '補填', genLabel: '填寫時間' }
};
const L = LBL[lang] || LBL.en;
const photoUrls = d.photoUrls || [];
const esc = s => String(s || '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let photoHtml = '';
for (let i = 0; i < photoUrls.length; i += 4) {
  const chunk = photoUrls.slice(i, i + 4);
  const cells = chunk.map(url => `<td style='width:50%;padding:4px'><img src='${url}' style='width:100%;height:auto'></td>`);
  while (cells.length < 4) cells.push(`<td style='width:50%;padding:4px'></td>`);
  photoHtml += `<table style='width:100%;border-collapse:collapse;margin-top:8px;page-break-inside:avoid'><tr>${cells.slice(0,2).join('')}</tr><tr>${cells.slice(2,4).join('')}</tr></table>`;
}
function buildHtml(Lb, weekday) {
  const genStamp = d.filledAtShort || '';
  const timeCell = esc(d.filledAtShort) + (d.lateEntry ? ` <b style='color:#a05a00'>(${Lb.late})</b>` : '');
  return `<!DOCTYPE html><html><head><meta charset='UTF-8'><style>body{font-family:Arial,'Noto Sans Thai',sans-serif;font-size:10pt;margin:0}.t{text-align:center;font-weight:bold;margin-bottom:4px}table.m{width:100%;border-collapse:collapse}table.m td{border:1px solid #333;padding:4px 6px;vertical-align:top}.gen-stamp{position:fixed;bottom:6mm;right:8mm;font-size:8pt;color:#aaaaaa}</style></head><body><div class='gen-stamp'>${Lb.genLabel}: ${genStamp}</div><div class='t' style='font-size:14pt'>ECO INFINIC</div><div class='t' style='font-size:12pt;margin-bottom:8px'>${Lb.title}</div><table class='m'><tr><td style='width:12%'><b>${Lb.projectName}</b></td><td style='width:38%'>${esc(d.projectName)}</td><td style='width:12%'><b>${Lb.constructionArea}</b></td><td style='width:38%'>${esc(d.constructionArea)}</td></tr><tr><td><b>${Lb.date}</b></td><td>${esc(d.date)}</td><td><b>${Lb.weekday}</b></td><td>${esc(weekday)}</td></tr><tr><td><b>${Lb.contractor}</b></td><td>${esc(d.contractor)}</td><td><b>${Lb.supervisor}</b></td><td>${esc(d.supervisor)}</td></tr><tr><td><b>${Lb.time}</b></td><td>${timeCell}</td><td><b>${Lb.photos}</b></td><td>${photoUrls.length}</td></tr></table>${photoHtml}</body></html>`;
}
const html = buildHtml(L, d.weekday);
const htmlZH = buildHtml(LBL.zh, d.weekdayZH);
const variants = [
  { lang: 'contractor', html, fileName: d.fileName },
  { lang: 'zh', html: htmlZH, fileName: d.fileName.replace('.pdf', '_ZH.pdf') }
];
return [{ json: { ...d, variants } }];
