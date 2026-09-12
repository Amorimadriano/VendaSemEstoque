async function checkAppLiveMode() {
  const token = process.env.META_ACCESS_TOKEN;
  const appId = '1394706491990358';
  const appSecret = process.env.META_APP_SECRET;

  if (appSecret) {
    const appToken = `${appId}|${appSecret}`;
    const res = await fetch(`https://graph.facebook.com/v26.0/${appId}?fields=id,name,link,live_mode,subcategory&access_token=${appToken}`);
    const data = await res.json();
    console.log('App Live Mode:', data);
  } else {
    console.log('META_APP_SECRET não está definido.');
  }
}

checkAppLiveMode().catch(console.error);
