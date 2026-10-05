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

const progressDesc = unmatchedNote + [
  `${warnPrefix}施工部位：${d.constructionLocation || '-'}`,
  `出工人數：${d.workers || '-'}人`,
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

return [{
  json: {
    // Date + contractor + project so several logs on the same day are told apart.
    pageTitle: [d.date, d.contractor, d.projectName].filter(Boolean).join(' ').slice(0, 120) + ' 監工日誌',
    logDate: d.date,
    progressDesc,
    issuesEncountered: `與廠商溝通協調記錄：${dZH.communication || d.communication || '無'}`,
    solutionsApplied: `其他重要事項記錄：${dZH.otherNotes || d.otherNotes || '無'}`,
    photoUrls: (d.photoUrls || []).join('\n'),
    relatedWorkItemIds
  }
}];
