async function inspectPostDetails() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  const res = await fetch(`https://graph.facebook.com/v26.0/${pageId}/posts?fields=id,privacy,is_published,timeline_visibility,status_type,shares&limit=5&access_token=${token}`);
  const data = await res.json();
  console.log('Posts details:', JSON.stringify(data, null, 2));
}

inspectPostDetails().catch(console.error);
