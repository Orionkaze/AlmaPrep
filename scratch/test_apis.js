// Use native fetch in Node 18+

async function testApi() {
  console.log('Testing /api/ai endpoint with demo session...');
  
  try {
    const response = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'mockmate-demo-session=true; mockmate-demo-user={"email":"test@example.com"}'
      },
      body: JSON.stringify({
        prompt: 'test prompt',
        task: 'next_question',
        userTier: 'free'
      })
    });

    const status = response.status;
    console.log('Status code:', status);
    
    if (status === 200) {
      const data = await response.json();
      console.log('Response data:', data);
      console.log('✅ AI endpoint works!');
    } else {
      const text = await response.text();
      console.log('Response error:', text);
      console.log('❌ AI endpoint returned an error.');
    }
  } catch (error) {
    console.error('Failed to make request:', error);
  }
}

testApi();
