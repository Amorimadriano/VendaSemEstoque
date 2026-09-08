async function inspectToken() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  console.log('=== INSPECTING META TOKEN & PAGE ===');

  // 1. Quem é o token atual?
  console.log('1. /me');
  const meRes = await fetch(`https://graph.facebook.com/v26.0/me?fields=id,name&access_token=${token}`);
  console.log('me:', await meRes.json());

  // 2. /me/accounts (se for User token)
  console.log('\n2. /me/accounts');
  const accRes = await fetch(`https://graph.facebook.com/v26.0/me/accounts?fields=id,name,instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${token}`);
  console.log('accounts:', await accRes.json());

  // 3. /PAGE_ID?fields=id,name,instagram_business_account,connected_instagram_account
  console.log('\n3. Page details: ' + pageId);
  const pageRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}?fields=id,name,instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${token}`);
  console.log('page:', await pageRes.json());

  // 4. Token permissions /me/permissions
  console.log('\n4. /me/permissions');
  const permRes = await fetch(`https://graph.facebook.com/v26.0/me/permissions?access_token=${token}`);
  console.log('permissions:', await permRes.json());
}

inspectToken();
