async function debug() {
  const token = process.env.META_ACCESS_TOKEN;
  console.log('Testing debug_token...');
  const res = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
  const data = await res.json();
  console.log('debug_token response:', JSON.stringify(data, null, 2));
}

debug();
