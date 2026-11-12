// Same LINE / Email as the daily report, minus Notion and the work-detail fields.
const d = $('Prepare Data').first().json;
const variantOrigins = $('Split Out').all();
const driveUploads = $('Google Drive Upload').all();
const idxOf = lang => variantOrigins.findIndex(it => it.json.lang === lang);
const driveUrl = 'https://drive.google.com/file/d/' + driveUploads[idxOf('contractor')].json.id + '/view';
const driveUrlZH = 'https://drive.google.com/file/d/' + driveUploads[idxOf('zh')].json.id + '/view';
const lang = d.language || 'en';
const CL = {
  en: { title: '✅ Site Photos Submitted', date: 'Date', project: 'Project', area: 'Area', photos: 'Photos', download: '📥 Download PDF', share: '📤 Share', shareTitle: 'Site Photo Report', filled: 'Filled in', late: '(late entry)' },
  th: { title: '✅ ส่งรูปภาพหน้างานสำเร็จ', date: 'วันที่', project: 'โครงการ', area: 'พื้นที่', photos: 'จำนวนรูป', download: '📥 ดาวน์โหลด PDF', share: '📤 แชร์', shareTitle: 'รายงานรูปภาพหน้างาน', filled: 'กรอกเมื่อ', late: '(บันทึกย้อนหลัง)' },
  zh: { title: '✅ 現場照片已送出', date: '日期', project: '工程', area: '廠區', photos: '照片', download: '📥 下載 PDF', share: '📤 分享', shareTitle: '現場照片回報', filled: '填寫時間', late: '（補填）' }
};
const cl = CL[lang] || CL.en;
const trunc = (s, n) => String(s || '').trim().substring(0, n) || '-';
function kv(label, value) {
  return { type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'sm', contents: [{ type: 'text', text: label, size: 'xs', color: '#888888', flex: 3, wrap: false }, { type: 'text', text: value, size: 'xs', color: '#333333', flex: 5, wrap: true }] };
}
// "Share" opens LINE's chat picker with a short summary + the PDF link (URI max 1000 chars)
function shareUri(cl, pdfUrl) {
  const head = `📷 ${cl.shareTitle} ${d.date || ''}`;
  const tail = `📥 PDF: ${pdfUrl}`;
  const full = [head, `${cl.project}: ${trunc(d.projectName, 40)}`, String(d.contractor || ''), tail].filter(Boolean).join('\n');
  const uri = 'https://line.me/R/share?text=' + encodeURIComponent(full);
  return uri.length <= 1000 ? uri : 'https://line.me/R/share?text=' + encodeURIComponent(head + '\n' + tail);
}
function buildFlex(cl, weekday, pdfUrl, headerColor, showFilled) {
  const body = [
    kv(cl.date, d.date + ' (' + weekday + ')' + (d.lateEntry ? ' ' + cl.late : '')),
    kv(cl.project, trunc(d.projectName, 50)),
    kv(cl.area, trunc(d.constructionArea, 50)),
    kv(cl.photos, String(d.photoCount)),
    ...(showFilled ? [kv(cl.filled, d.filledAtShort || '-')] : [])
  ];
  // First photo as the bubble image, so the message shows what was sent
  const hero = d.photoUrls && d.photoUrls[0]
    ? { type: 'image', url: d.photoUrls[0], size: 'full', aspectRatio: '4:3', aspectMode: 'cover', action: { type: 'uri', uri: pdfUrl } }
    : undefined;
  return {
    type: 'bubble',
    header: { type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: '14px', contents: [{ type: 'text', text: cl.title, color: '#ffffff', weight: 'bold', size: 'md', wrap: true }, { type: 'text', text: String(d.contractor || ''), color: '#ffffffcc', size: 'xs', margin: 'xs' }] },
    ...(hero ? { hero } : {}),
    body: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: body },
    footer: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '10px', contents: [
      { type: 'button', style: 'primary', color: headerColor, height: 'sm', action: { type: 'uri', label: cl.download, uri: pdfUrl } },
      { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: cl.share, uri: shareUri(cl, pdfUrl) } }
    ] }
  };
}
const contractorFlex = { to: d.lineUserId, messages: [{ type: 'flex', altText: cl.title, contents: buildFlex(cl, d.weekday, driveUrl, '#1a73e8', false) }] };
const jerryFlex = { to: 'Ubf65144da2093a2cb9e01528d773413f', messages: [{ type: 'flex', altText: CL.zh.title, contents: buildFlex(CL.zh, d.weekdayZH, driveUrlZH, '#0d7a0d', true) }] };
function escHtml(s) { return String(s || '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
const JERRY_EMAIL = 'jerry_hsieh@eco-infinic.com';
const recipientEmail = (d.supervisorEmail || '').trim() || JERRY_EMAIL;
const isJerry = recipientEmail.toLowerCase() === JERRY_EMAIL.toLowerCase();
const emailSubject = `現場照片回報 - ${d.projectName || ''} - ${d.date || ''}`;
const emailHtml = `<p><b>${escHtml(d.contractor)}</b> 提交了新的現場照片回報（負責工程師：${escHtml(d.supervisor)}）。</p><p>工程：${escHtml(d.projectName)}<br>廠區：${escHtml(d.constructionArea)}<br>日期：${escHtml(d.date)}（${escHtml(d.weekdayZH)}）${d.lateEntry ? '<b style="color:#a05a00">（補填）</b>' : ''}<br>廠商：${escHtml(d.contractor)}<br>照片：${d.photoCount} 張<br>填寫時間：${escHtml(d.filledAtShort)}</p><p><a href="${driveUrlZH}">📥 下載中文版 PDF</a></p>`;
return [{ json: { contractorPayload: JSON.stringify(contractorFlex), jerryPayload: JSON.stringify(jerryFlex), isJerry, recipientEmail, emailSubject, emailHtml } }];
