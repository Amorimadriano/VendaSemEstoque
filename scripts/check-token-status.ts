async function debugToken() {
  const token = process.env.META_ACCESS_TOKEN;
  console.log('Token length:', token?.length);
  const res = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${token}&access_token=${token}`);
  const data = await res.json();
  console.log('Token Debug:', JSON.stringify(data, null, 2));
}

debugToken().catch(console.error);
