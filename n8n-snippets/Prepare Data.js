const raw = $input.first().json;
const d = raw.body || raw;
// Drop a report this workflow already received (same submissionId from the
// form — e.g. "Resubmit" after the first reply was lost on site). Returning
// no items stops the workflow, so no duplicate PDF / Notion page / LINE push.
// Workflow static data persists across production (active) runs only.
if (d.submissionId) {
  const store = $getWorkflowStaticData('global');
  const seen = store.seenSubmissions || {};
  const now = Date.now();
  for (const id of Object.keys(seen)) if (now - seen[id] > 3 * 24 * 3600 * 1000) delete seen[id]; // keep 3 days
  if (seen[d.submissionId]) return [];
  seen[d.submissionId] = now;
  store.seenSubmissions = seen;
}

// Fill-in time comes from the phone ("2026/10/13 18:30:05 (Asia/Bangkok, UTC+7)"),
// so the n8n server's time zone never matters. Reports from an older form
// version don't send it — fall back to the server clock in Bangkok time.
const pad2 = n => String(n).padStart(2, '0');
let filledAtLocal = String(d.filledAtLocal || '').trim();
let filledDate = String(d.filledDate || '').trim();
if (!filledAtLocal) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  filledAtLocal = `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second} (Asia/Bangkok, UTC+7)`;
  filledDate = `${p.year}-${p.month}-${p.day}`;
}
// "2026/10/13 18:30 (UTC+7)" — short form for the PDF / LINE
const m = filledAtLocal.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})(?::\d{2})?\s*\((?:.*?,\s*)?([^)]*)\)/);
const filledAtShort = m ? `${m[1]} (${m[2]})` : filledAtLocal;
const submitTime = filledAtShort;
// Log date earlier than the day it was filled in = filled in afterwards
const lateEntry = !!(d.date && filledDate && d.date < filledDate);

const localeMap = { en: 'en-US', th: 'th-TH', zh: 'zh-TW' };
const dateObj = new Date(d.date + 'T00:00:00');
const weekday = dateObj.toLocaleDateString(localeMap[d.language] || 'en-US', { weekday: 'long' });
const weekdayZH = dateObj.toLocaleDateString('zh-TW', { weekday: 'long' });

// Weather and hazardous-work labels, shared by the PDF / LINE / Notion nodes
const WX = {
  en: { sunny: '☀️ Sunny', rainy: '🌧️ Rain', heavyRain: '🌧️🌧️ Heavy rain', strongWind: '💨 Strong wind', thunderstorm: '⛈️ Thunderstorm' },
  th: { sunny: '☀️ แดดออก', rainy: '🌧️ ฝนตก', heavyRain: '🌧️🌧️ ฝนตกหนัก', strongWind: '💨 ลมแรง', thunderstorm: '⛈️ พายุฝนฟ้าคะนอง' },
  zh: { sunny: '☀️ 晴天', rainy: '🌧️ 下雨', heavyRain: '🌧️🌧️ 大雨', strongWind: '💨 強風', thunderstorm: '⛈️ 雷雨' }
};
const HZ = {
  en: { none: 'No hazardous work', hotWork: 'Hot work', lifting: 'Lifting', height: 'Work at height', confinedSpace: 'Confined space' },
  th: { none: 'ไม่มีงานอันตราย', hotWork: 'งานที่ก่อให้เกิดประกายไฟ', lifting: 'งานยก', height: 'งานบนที่สูง', confinedSpace: 'งานในที่อับอากาศ' },
  zh: { none: '無危險作業', hotWork: '動火作業', lifting: '吊裝作業', height: '高空作業', confinedSpace: '局限空間作業' }
};
const hazardCodes = String(d.hazardWork || '').split(',').map(s => s.trim()).filter(c => HZ.zh[c]);
const riskCodes = hazardCodes.filter(c => c !== 'none');
const labelsFor = lg => {
  const sep = lg === 'zh' ? '、' : ', ';
  return {
    mW: WX[lg][d.morningWeather] || d.morningWeather || '-',
    aW: WX[lg][d.afternoonWeather] || d.afternoonWeather || '-',
    hazard: hazardCodes.length ? hazardCodes.map(c => HZ[lg][c]).join(sep) : '-',
    risk: riskCodes.map(c => HZ[lg][c]).join(sep)
  };
};
const labels = { contractor: labelsFor(WX[d.language] ? d.language : 'en'), zh: labelsFor('zh') };

const safeStr = s => (s || '').slice(0, 30);
const fileName = `${d.date}_${safeStr(d.contractor)}_${safeStr(d.projectName)}.pdf`;
const photoUrls = d.photoUrls || [];
return [{ json: {
  ...d, submitTime, filledAtLocal, filledAtShort, filledDate, lateEntry,
  weekday, weekdayZH, fileName, photoUrls, photoCount: photoUrls.length,
  hazardCodes, riskCodes, labels
} }];
