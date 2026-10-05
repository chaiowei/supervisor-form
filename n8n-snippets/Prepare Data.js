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
const now = new Date();
const submitTime = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
const localeMap = { en: 'en-US', th: 'th-TH', zh: 'zh-TW' };
const dateObj = new Date(d.date + 'T00:00:00');
const weekday = dateObj.toLocaleDateString(localeMap[d.language] || 'en-US', { weekday: 'long' });
const weekdayZH = dateObj.toLocaleDateString('zh-TW', { weekday: 'long' });
const safeStr = s => (s || '').slice(0, 30);
const fileName = `${d.date}_${safeStr(d.contractor)}_${safeStr(d.projectName)}.pdf`;
const photoUrls = d.photoUrls || [];
return [{ json: { ...d, submitTime, weekday, weekdayZH, fileName, photoUrls, photoCount: photoUrls.length } }];
