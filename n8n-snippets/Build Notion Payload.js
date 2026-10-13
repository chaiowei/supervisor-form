const d = $('Prepare Data').first().json;
const genNode = $('Generate PDF HTML').first().json;
const dZH = genNode.translatedZH || d;
const translationFailed = genNode.geminiStatus !== 'success';

const variantOrigins = $('Split Out').all();
const driveUploads = $('Google Drive Upload').all();
const idxOf = lang => variantOrigins.findIndex(it => it.json.lang === lang);
const driveUrl = 'https://drive.google.com/file/d/' + driveUploads[idxOf('contractor')].json.id + '/view';
const driveUrlZH = 'https://drive.google.com/file/d/' + driveUploads[idxOf('zh')].json.id + '/view';

// notionProjectUrls comes from index.html, resolved client-side from the
// Google Sheets "Notion工程連結" column for each selected project.
const rawUrls = Array.isArray(d.notionProjectUrls) ? d.notionProjectUrls : String(d.notionProjectUrls || '').split(',');
const toPageId = url => {
  const m = String(url || '').match(/([0-9a-f]{32})(?:[?#]|$)/i);
  if (!m) return null;
  const h = m[1];
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};
const relatedWorkItemIds = rawUrls.map(toPageId).filter(Boolean);
const unmatchedCount = rawUrls.filter(u => String(u || '').trim() && !toPageId(u)).length;

const warnPrefix = translationFailed ? '⚠️ 自動翻譯失敗，以下為原文，請人工確認 / ' : '';
const unmatchedNote = unmatchedCount > 0
  ? `⚠️ 有 ${unmatchedCount} 個工程在 Google Sheets 裡尚未設定 Notion 連結，Related Work Item 未自動關聯，請手動補上。\n\n`
  : '';

const lbZ = (d.labels && d.labels.zh) || {};

const progressDesc = unmatchedNote + [
  `${warnPrefix}施工部位：${d.constructionLocation || '-'}`,
  `出工人數：${d.workers ?? '-'}人`,
  `今日危險作業：${lbZ.risk ? '⚠️ ' : ''}${lbZ.hazard || '-'}`,
  `填寫時間：${d.filledAtLocal || '-'}${d.lateEntry ? '（補填）' : ''}`,
  '',
  '今日施工項目：',
  dZH.constructionItems || d.constructionItems || '-',
  '',
  '明日預計工作：',
  dZH.tomorrowPlan || d.tomorrowPlan || '-',
  '',
  `供給材料：${dZH.materialsUsed || d.materialsUsed || '-'}`,
  `機具使用：${dZH.equipment || d.equipment || '-'}`,
  '',
  `📥 承包商版 PDF: ${driveUrl}`,
  `📥 中文版 PDF: ${driveUrlZH}`
].join('\n');

// Notion caps one rich_text piece at 2000 characters (a longer one fails the
// whole page), so long text is split into several pieces (max 100).
const richText = s => {
  const str = String(s || '');
  const parts = [];
  for (let i = 0; i < str.length && parts.length < 100; i += 2000) parts.push({ type: 'text', text: { content: str.slice(i, i + 2000) } });
  return parts;
};
// Select option names can't contain commas and are capped at 100 characters
const selectName = s => String(s || '').replace(/,/g, '，').trim().slice(0, 100);
const select = s => selectName(s) ? { select: { name: selectName(s) } } : { select: null };
const wxZH = code => ({ sunny: '晴天', rainy: '下雨', heavyRain: '大雨', strongWind: '強風', thunderstorm: '雷雨' }[code] || '');
const HZ_ZH = { none: '無危險作業', hotWork: '動火作業', lifting: '吊裝作業', height: '高空作業', confinedSpace: '局限空間作業' };
const workers = Number(d.workers);

// Date + contractor + project so several logs on the same day are told apart.
const pageTitle = [d.date, d.contractor, d.projectName].filter(Boolean).join(' ').slice(0, 120) + ' 監工日誌';

const properties = {
  '名稱': { title: richText(pageTitle) },
  'Progress Desc': { rich_text: richText(progressDesc) },
  'Issues Encountered': { rich_text: richText(`與廠商溝通協調記錄：${dZH.communication || d.communication || '無'}`) },
  'Solutions Applied': { rich_text: richText(`其他重要事項記錄：${dZH.otherNotes || d.otherNotes || '無'}`) },
  'Photo URLs': { rich_text: richText((d.photoUrls || []).join('\n')) },
  'Related Work Item': { relation: relatedWorkItemIds.map(id => ({ id })) },
  'Contractor': select(d.contractor),
  'Engineer': select(d.supervisor),
  'Workers': { number: Number.isFinite(workers) && String(d.workers ?? '') !== '' ? workers : null },
  'AM Weather': select(wxZH(d.morningWeather)),
  'PM Weather': select(wxZH(d.afternoonWeather)),
  'Hazardous Work': { multi_select: (d.hazardCodes || []).map(c => ({ name: HZ_ZH[c] })).filter(o => o.name) },
  'Filled At': { rich_text: richText(d.filledAtLocal || '') },
  'Late Entry': { checkbox: !!d.lateEntry },
};
if (d.date) properties['Log Date'] = { date: { start: d.date } };

return [{
  json: {
    pageTitle,
    relatedWorkItemIds,
    // Request body for "Notion: Create Daily Log" (HTTP Request → POST /v1/pages)
    body: {
      parent: { type: 'data_source_id', data_source_id: '2190dd6f-6b0a-803a-b151-000bc01c3b86' },
      properties
    }
  }
}];
