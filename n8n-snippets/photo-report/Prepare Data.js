// Supervisor Photo Report — basic info + site photos only (photo.html).
// Same as the daily report's Prepare Data, minus weather / hazardous work.
const raw = $input.first().json;
const d = raw.body || raw;
// Drop a report this workflow already received (same submissionId — e.g.
// "Resubmit" after the first reply was lost on site). Returning no items stops
// the workflow, so no duplicate LINE push.
if (d.submissionId) {
  const store = $getWorkflowStaticData('global');
  const seen = store.seenSubmissions || {};
  const now = Date.now();
  for (const id of Object.keys(seen)) if (now - seen[id] > 3 * 24 * 3600 * 1000) delete seen[id]; // keep 3 days
  if (seen[d.submissionId]) return [];
  seen[d.submissionId] = now;
  store.seenSubmissions = seen;
}

// Fill-in time comes from the phone, so the n8n server's time zone never matters
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
const m = filledAtLocal.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})(?::\d{2})?\s*\((?:.*?,\s*)?([^)]*)\)/);
const filledAtShort = m ? `${m[1]} (${m[2]})` : filledAtLocal;
const lateEntry = !!(d.date && filledDate && d.date < filledDate);

const localeMap = { en: 'en-US', th: 'th-TH', zh: 'zh-TW' };
const dateObj = new Date(d.date + 'T00:00:00');
const weekday = dateObj.toLocaleDateString(localeMap[d.language] || 'en-US', { weekday: 'long' });
const weekdayZH = dateObj.toLocaleDateString('zh-TW', { weekday: 'long' });

const photoUrls = d.photoUrls || [];
return [{ json: {
  ...d, submitTime: filledAtShort, filledAtLocal, filledAtShort, filledDate, lateEntry,
  weekday, weekdayZH, photoUrls, photoCount: photoUrls.length
} }];
