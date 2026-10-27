async function testResources() {
  const carsRes = await fetch('http://localhost:5000/api.php?resource=cars');
  const carsData = await carsRes.json();
  console.log('Cars:', carsRes.status, 'Count:', Array.isArray(carsData) ? carsData.length : carsData);

  const hotelsRes = await fetch('http://localhost:5000/api.php?resource=hotels');
  const hotelsData = await hotelsRes.json();
  console.log('Hotels:', hotelsRes.status, 'Count:', Array.isArray(hotelsData) ? hotelsData.length : hotelsData);

  const actRes = await fetch('http://localhost:5000/api.php?resource=activities');
  const actData = await actRes.json();
  console.log('Activities:', actRes.status, 'Count:', Array.isArray(actData) ? actData.length : actData);
}

testResources();
