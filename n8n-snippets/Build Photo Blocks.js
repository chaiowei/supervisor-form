const d = $('Prepare Data1').first().json;
const photoUrls = d.photoUrls || [];
const pageId = $json.id;
// No page id = "Notion: Create Daily Log" failed (it continues on fail); Build
// Messages already warns Jerry about that, so just skip the photos.
if (!photoUrls.length || !pageId || $json.error) return [];
const children = photoUrls.map(url => ({
  object: 'block',
  type: 'image',
  image: { type: 'external', external: { url } }
}));
return [{ json: { pageId, children } }];
