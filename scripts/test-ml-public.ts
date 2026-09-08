async function testMLPublic() {
  const url = 'https://api.mercadolibre.com/sites/MLB/search?q=celular&limit=5';
  console.log('Testing public ML search without Authorization header...');
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Text preview:', text.slice(0, 300));
    if (text.startsWith('{')) {
      const data = JSON.parse(text);
      console.log('Results count:', data.results?.length);
      if (data.results?.length > 0) {
        console.log('Sample product 1:');
        console.log({
          id: data.results[0].id,
          title: data.results[0].title,
          price: data.results[0].price,
          permalink: data.results[0].permalink,
          thumbnail: data.results[0].thumbnail,
        });
      }
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testMLPublic();
