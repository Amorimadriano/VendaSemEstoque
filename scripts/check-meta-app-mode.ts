async function checkAppMode() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  // 1. App Info
  const appRes = await fetch(`https://graph.facebook.com/v26.0/app?fields=id,name,link,restrictions&access_token=${token}`);
  const appData = await appRes.json();
  console.log('1. Meta App Info:', appData);

  // 2. Page Published Status & Country/Age Restrictions
  const pageRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}?fields=id,name,is_published,talking_about_count,fan_count,verification_status&access_token=${token}`);
  const pageData = await pageRes.json();
  console.log('2. Page Public Details:', pageData);

  // 3. Page Roles / Admin accounts
  const rolesRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}/roles?access_token=${token}`);
  const rolesData = await rolesRes.json();
  console.log('3. Page Roles:', rolesData);
}

checkAppMode().catch(console.error);
