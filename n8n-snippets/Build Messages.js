const d = $('Prepare Data').first().json;
const genNode = $('Generate PDF HTML').first().json;
const dZH = genNode.translatedZH || d;
const translationFailed = genNode.geminiStatus !== 'success';
const variantOrigins = $('Split Out').all();
const driveUploads = $('Google Drive Upload').all();
const idxOf = lang => variantOrigins.findIndex(it => it.json.lang === lang);
const driveFileId = driveUploads[idxOf('contractor')].json.id;
const driveUrl = 'https://drive.google.com/file/d/' + driveFileId + '/view';
const driveFileIdZH = driveUploads[idxOf('zh')].json.id;
const driveUrlZH = 'https://drive.google.com/file/d/' + driveFileIdZH + '/view';
// This node now runs after "Notion: Create Daily Log" so Jerry's message can
// link the new Notion page. That node continues on fail — if it errored (or
// didn't run), there's simply no Notion button.
let notionUrl = '';
try {
  const n = $('Notion: Create Daily Log').first().json;
  if (n && !n.error && n.id) notionUrl = n.url || ('https://www.notion.so/' + String(n.id).replace(/-/g, ''));
} catch (e) { notionUrl = ''; }
const lang = d.language || 'en';
const W = { en: { sunny: '☀️ Sunny', rainy: '🌧️ Rainy' }, th: { sunny: '☀️ แดดออก', rainy: '🌧️ ฝนตก' }, zh: { sunny: '☀️ 晴天', rainy: '🌧️ 下雨' } };
const wC = W[lang] || W.en;
const mW = wC[d.morningWeather] || d.morningWeather || '-';
const aW = wC[d.afternoonWeather] || d.afternoonWeather || '-';
const mWZH = W.zh[d.morningWeather] || d.morningWeather || '-';
const aWZH = W.zh[d.afternoonWeather] || d.afternoonWeather || '-';
const CL = {
  en: { title: '✅ Work Report Submitted', morning: 'AM', afternoon: 'PM', date: 'Date', project: 'Project', area: 'Area', weather: 'Weather', workers: 'Workers', location: '📍 Location', workDone: '🔨 Work Done', tomorrow: '📋 Tomorrow Plan', materials: '🧱 Materials', equipment: '⚙️ Equipment', comms: '💬 Communication', notes: '📝 Notes', sampling: '🧪 Sampling', quality: '✔️ Quality Check', download: '📥 Download PDF', share: '📤 Share', shareTitle: 'Daily Work Log', notion: '📒 Open Notion Page' },
  th: { title: '✅ ส่งรายงานสำเร็จ', morning: 'เช้า', afternoon: 'บ่าย', date: 'วันที่', project: 'โครงการ', area: 'พื้นที่', weather: 'อากาศ', workers: 'คนงาน', location: '📍 ตำแหน่ง', workDone: '🔨 งานวันนี้', tomorrow: '📋 แผนพรุ่งนี้', materials: '🧱 วัสดุ', equipment: '⚙️ เครื่องมือ', comms: '💬 ประสานงาน', notes: '📝 หมายเหตุ', sampling: '🧪 ตัวอย่าง', quality: '✔️ ตรวจสอบ', download: '📥 ดาวน์โหลด PDF', share: '📤 แชร์', shareTitle: 'บันทึกงานประจำวัน', notion: '📒 เปิดหน้า Notion' },
  zh: { title: '✅ 監工日誌已送出', morning: '上午', afternoon: '下午', date: '日期', project: '工程', area: '廠區', weather: '天氣', workers: '出工人數', location: '📍 施工部位', workDone: '🔨 今日施工', tomorrow: '📋 明日計畫', materials: '🧱 材料', equipment: '⚙️ 機具', comms: '💬 溝通記錄', notes: '📝 其他備注', sampling: '🧪 取樣記錄', quality: '✔️ 品質檢查', download: '📥 下載 PDF', share: '📤 分享', shareTitle: '監工日誌', notion: '📒 開啟 Notion 頁面' }
};
const cl = CL[lang] || CL.en;
const clZH = translationFailed ? { ...CL.zh, title: '⚠️翻譯失敗(原文) ' + CL.zh.title } : CL.zh;
const trunc = (s, n) => String(s || '').trim().substring(0, n) || '-';
function kv(label, value) {
  return { type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'sm', contents: [{ type: 'text', text: label, size: 'xs', color: '#888888', flex: 3, wrap: false }, { type: 'text', text: value, size: 'xs', color: '#333333', flex: 5, wrap: true }] };
}
function lbl(text) {
  return { type: 'text', text: text, size: 'xs', color: '#1a73e8', weight: 'bold', margin: 'md' };
}
function txt(text) {
  return { type: 'text', text: text, size: 'sm', color: '#333333', wrap: true, margin: 'xs' };
}
function sep() { return { type: 'separator', margin: 'sm', color: '#eeeeee' }; }
// "Share" opens LINE's own chat picker (line.me/R/share) with a short summary
// + the PDF link. LINE caps a URI action at 1000 chars and Thai/Chinese text
// triples when URL-encoded, so the project name is dropped if it would overflow.
function shareUri(cl, data, pdfUrl) {
  const head = `📋 ${cl.shareTitle} ${data.date || ''}`;
  const tail = `📥 PDF: ${pdfUrl}`;
  const full = [head, `${cl.project}: ${trunc(data.projectName, 40)}`, String(data.contractor || ''), tail].filter(Boolean).join('\n');
  const uri = 'https://line.me/R/share?text=' + encodeURIComponent(full);
  return uri.length <= 1000 ? uri : 'https://line.me/R/share?text=' + encodeURIComponent(head + '\n' + tail);
}
function buildFlex(cl, data, mWeather, aWeather, pdfUrl, headerColor, notionLink) {
  const body = [
    kv(cl.date, data.date + ' (' + data.weekday + ')'),
    kv(cl.project, trunc(data.projectName, 50)),
    kv(cl.area, trunc(data.constructionArea, 50)),
    kv(cl.weather, cl.morning + ': ' + mWeather + '  ' + cl.afternoon + ': ' + aWeather),
    kv(cl.workers, String(data.workers || '-')),
    sep(),
    lbl(cl.location), txt(trunc(data.constructionLocation, 150)),
    sep(),
    lbl(cl.workDone), txt(trunc(data.constructionItems, 200))
  ];
  if (data.tomorrowPlan) { body.push(sep()); body.push(lbl(cl.tomorrow)); body.push(txt(trunc(data.tomorrowPlan, 150))); }
  if (data.materialsUsed || data.equipment) {
    body.push(sep());
    if (data.materialsUsed) body.push(kv(cl.materials, trunc(data.materialsUsed, 100)));
    if (data.equipment) body.push(kv(cl.equipment, trunc(data.equipment, 100)));
  }
  if (data.communication) { body.push(sep()); body.push(lbl(cl.comms)); body.push(txt(trunc(data.communication, 150))); }
  if (data.samplingTests) { body.push(sep()); body.push(lbl(cl.sampling)); body.push(txt(trunc(data.samplingTests, 150))); }
  if (data.qualityInspection) { body.push(sep()); body.push(lbl(cl.quality)); body.push(txt(trunc(data.qualityInspection, 150))); }
  if (data.otherNotes) { body.push(sep()); body.push(lbl(cl.notes)); body.push(txt(trunc(data.otherNotes, 150))); }
  const footer = [
    { type: 'button', style: 'primary', color: headerColor, height: 'sm', action: { type: 'uri', label: cl.download, uri: pdfUrl } },
    { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: cl.share, uri: shareUri(cl, data, pdfUrl) } }
  ];
  if (notionLink) footer.push({ type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: cl.notion, uri: notionLink } });
  return {
    type: 'bubble',
    header: { type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: '14px', contents: [{ type: 'text', text: cl.title, color: '#ffffff', weight: 'bold', size: 'md', wrap: true }, { type: 'text', text: String(data.contractor || ''), color: '#ffffffcc', size: 'xs', margin: 'xs' }] },
    body: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: body },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '10px', contents: footer }
  };
}
// Contractor: download + share. Jerry: download + share + Notion page.
const contractorBubble = buildFlex(cl, d, mW, aW, driveUrl, '#1a73e8', '');
const jerryBubble = buildFlex(clZH, dZH, mWZH, aWZH, driveUrlZH, translationFailed ? '#e53e3e' : '#0d7a0d', notionUrl);
const contractorFlex = { to: d.lineUserId, messages: [{ type: 'flex', altText: cl.title, contents: contractorBubble }] };
// The Chinese report goes to the engineer in charge: their LINE ID comes from
// the options Sheet ("LINE ID" column, sent by the form as supervisorLineId).
// Engineers without one fall back to Jerry only when Jerry is the recipient.
const JERRY_LINE_ID = 'Ubf65144da2093a2cb9e01528d773413f';
const JERRY_EMAIL = 'jerry_hsieh@eco-infinic.com';
const recipientEmail = (d.supervisorEmail || '').trim() || JERRY_EMAIL;
const recipientIsJerry = recipientEmail.toLowerCase() === JERRY_EMAIL.toLowerCase();
const supervisorLineId = String(d.supervisorLineId || '').trim() || (recipientIsJerry ? JERRY_LINE_ID : '');
const jerryFlex = { to: supervisorLineId, messages: [{ type: 'flex', altText: clZH.title, contents: jerryBubble }] };
function escHtml(s) { return String(s || '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
// "isJerry" feeds the existing "Is Jerry?" IF node: it now means "this
// report's engineer has a LINE ID to push to" (name kept so the IF node
// needs no change).
const isJerry = !!supervisorLineId;
const emailSubject = `${translationFailed ? '⚠️翻譯失敗(原文) - ' : ''}監工日誌通知 - ${d.projectName || ''} - ${d.date || ''}`;
const emailHtml = `${translationFailed ? '<p style="color:#e53e3e;font-weight:bold">⚠️ 自動翻譯失敗，本次中文版PDF內容為原文（非正式翻譯），請人工確認後再轉發。</p>' : ''}<p>負責工程師 <b>${escHtml(d.supervisor)}</b> 提交了新的監工日誌。</p><p>工程：${escHtml(d.projectName)}<br>廠區：${escHtml(d.constructionArea)}<br>日期：${escHtml(d.date)}（${escHtml(dZH.weekday)}）<br>廠商：${escHtml(d.contractor)}</p><p><a href="${driveUrlZH}">📥 下載中文版 PDF 報告</a>${notionUrl ? `<br><a href="${notionUrl}">📒 開啟 Notion 頁面</a>` : ''}</p>`;
return [{ json: { contractorPayload: JSON.stringify(contractorFlex), jerryPayload: JSON.stringify(jerryFlex), isJerry, recipientEmail, emailSubject, emailHtml } }];
