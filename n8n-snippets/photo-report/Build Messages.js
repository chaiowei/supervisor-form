// Supervisor Photo Report — no PDF, no Email, no Notion. The photos are
// already in Google Drive (uploaded one by one through "Supervisor Photo
// Upload"); this only sends LINE messages: a carousel with a summary bubble
// and one bubble per photo (tap to open the photo in Drive).
const d = $('Prepare Data').first().json;
const lang = d.language || 'en';
const CL = {
  en: { title: '✅ Site Photos Submitted', date: 'Date', project: 'Project', area: 'Area', photos: 'Photos', engineer: 'Engineer', filled: 'Filled in', late: '(late entry)', open: '🔍 Open photo', saved: 'Photos are saved to Google Drive.' },
  th: { title: '✅ ส่งรูปภาพหน้างานสำเร็จ', date: 'วันที่', project: 'โครงการ', area: 'พื้นที่', photos: 'จำนวนรูป', engineer: 'ผู้ควบคุมงาน', filled: 'กรอกเมื่อ', late: '(บันทึกย้อนหลัง)', open: '🔍 เปิดรูป', saved: 'บันทึกรูปภาพไว้ใน Google Drive แล้ว' },
  zh: { title: '📷 現場照片回報', date: '日期', project: '工程', area: '廠區', photos: '照片', engineer: '負責工程師', filled: '填寫時間', late: '（補填）', open: '🔍 開啟照片', saved: '照片已存到 Google 雲端硬碟' }
};
const trunc = (s, n) => String(s || '').trim().substring(0, n) || '-';
const photoUrls = (d.photoUrls || []).filter(u => /^https:\/\//.test(u));
function kv(label, value) {
  return { type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'sm', contents: [{ type: 'text', text: label, size: 'xs', color: '#888888', flex: 3, wrap: false }, { type: 'text', text: value, size: 'xs', color: '#333333', flex: 5, wrap: true }] };
}
function summaryBubble(cl, weekday, headerColor, forJerry) {
  const body = [
    kv(cl.date, d.date + ' (' + weekday + ')' + (d.lateEntry ? ' ' + cl.late : '')),
    kv(cl.project, trunc(d.projectName, 60)),
    kv(cl.area, trunc(d.constructionArea, 60)),
    ...(forJerry ? [kv(cl.engineer, trunc(d.supervisor, 40)), kv(cl.filled, d.filledAtShort || '-')] : []),
    kv(cl.photos, String(photoUrls.length) + (d.skippedPhotoCount ? ` (+${d.skippedPhotoCount} ✕)` : '')),
    { type: 'text', text: cl.saved, size: 'xxs', color: '#888888', wrap: true, margin: 'md' }
  ];
  return {
    type: 'bubble', size: 'kilo',
    header: { type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: '14px', contents: [{ type: 'text', text: cl.title, color: '#ffffff', weight: 'bold', size: 'md', wrap: true }, { type: 'text', text: String(d.contractor || ''), color: '#ffffffcc', size: 'xs', margin: 'xs', wrap: true }] },
    body: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: body }
  };
}
function photoBubble(cl, url, i) {
  return {
    type: 'bubble', size: 'kilo',
    hero: { type: 'image', url, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', action: { type: 'uri', uri: url } },
    footer: { type: 'box', layout: 'horizontal', paddingAll: '8px', contents: [
      { type: 'text', text: `${i + 1}/${photoUrls.length}`, size: 'xs', color: '#888888', gravity: 'center', flex: 1 },
      { type: 'button', style: 'link', height: 'sm', flex: 3, action: { type: 'uri', label: cl.open, uri: url } }
    ] }
  };
}
// LINE carousel: max 12 bubbles (1 summary + up to 10 photos)
function carousel(cl, weekday, headerColor, forJerry) {
  return { type: 'flex', altText: `${cl.title} ${d.date || ''} ${trunc(d.projectName, 40)}`.slice(0, 400),
    contents: { type: 'carousel', contents: [summaryBubble(cl, weekday, headerColor, forJerry), ...photoUrls.slice(0, 11).map((u, i) => photoBubble(cl, u, i))] } };
}
const cl = CL[lang] || CL.en;
const contractorMsg = { to: d.lineUserId, messages: [carousel(cl, d.weekday, '#1a73e8', false)] };
// Jerry always gets the Chinese version
const jerryMsg = { to: 'Ubf65144da2093a2cb9e01528d773413f', messages: [carousel(CL.zh, d.weekdayZH, '#0d7a0d', true)] };
return [{ json: { contractorPayload: JSON.stringify(contractorMsg), jerryPayload: JSON.stringify(jerryMsg) } }];
