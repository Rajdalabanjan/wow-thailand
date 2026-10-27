async function testLogin(username, password) {
  const res = await fetch('http://localhost:5000/api.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json().catch(() => null);
  console.log(`Login [${username}]:`, res.status, data?.user ? `Role: ${data.user.role}, Name: ${data.user.name}` : data);
}

async function run() {
  await testLogin('cabs_operator', 'admin@2026');
  await testLogin('phuket_resorts', 'admin@2026');
  await testLogin('admin', 'admin@2026');
  await testLogin('superadmin', 'superadmin');
  await testLogin('superadmin', 'admin@2026');
}

run();
