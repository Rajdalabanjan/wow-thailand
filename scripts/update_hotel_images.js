const path = require('path');
const mysql = require(path.resolve(__dirname, '../backend/node_modules/mysql2'));
require(path.resolve(__dirname, '../backend/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../backend/.env') });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trip_galileo'
  });
  const conn = pool.promise();

  console.log('Connected to DB');

  // 1. Update th-htl-01: The Shore at Katathani (Phuket Beachfront Pool Villas)
  const phuketHotelImgs = [
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotels SET images_json = ? WHERE id = ?', [JSON.stringify(phuketHotelImgs), 'th-htl-01']);

  // Room 1: rm-phuket-01
  const rmPhuket01Imgs = [
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmPhuket01Imgs), 'rm-phuket-01']);

  // Room 2: rm-phuket-02
  const rmPhuket02Imgs = [
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmPhuket02Imgs), 'rm-phuket-02']);


  // 2. Update th-htl-02: Banyan Tree Bangkok (Urban Skyscraper & Moon Bar)
  const bkkHotelImgs = [
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1400&q=80', // Bangkok skyline
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80', // Vertigo rooftop
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80', // Luxury lobby
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80', // Rooftop dining
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80', // Spa
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80'  // Luxury interior
  ];
  await conn.query('UPDATE hotels SET images_json = ? WHERE id = ?', [JSON.stringify(bkkHotelImgs), 'th-htl-02']);

  // Room 1: rm-bkk-01
  const rmBkk01Imgs = [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmBkk01Imgs), 'rm-bkk-01']);

  // Room 2: rm-bkk-02
  const rmBkk02Imgs = [
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmBkk02Imgs), 'rm-bkk-02']);


  // 3. Update th-htl-03: Rayavadee Resort (Krabi Phra Nang Peninsula Limestone Karsts)
  const krabiHotelImgs = [
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotels SET images_json = ? WHERE id = ?', [JSON.stringify(krabiHotelImgs), 'th-htl-03']);

  // Room 1: rm-krabi-01
  const rmKrabi01Imgs = [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmKrabi01Imgs), 'rm-krabi-01']);


  // 4. Update th-htl-04: Hilton Pattaya (Pattaya Bay High-Rise Infinity Resort)
  const pattayaHotelImgs = [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotels SET images_json = ? WHERE id = ?', [JSON.stringify(pattayaHotelImgs), 'th-htl-04']);

  // Room 1: rm-pattaya-01
  const rmPattaya01Imgs = [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmPattaya01Imgs), 'rm-pattaya-01']);

  // Room 2: rm-pattaya-02
  const rmPattaya02Imgs = [
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(rmPattaya02Imgs), 'rm-pattaya-02']);


  // 5. Update th-htl-556914: hotel taj (Bangkok Heritage Palace Hotel)
  const tajHotelImgs = [
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotels SET images_json = ? WHERE id = ?', [JSON.stringify(tajHotelImgs), 'th-htl-556914']);

  // Room 1: rt-557253-332
  const tajRoomImgs = [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80'
  ];
  await conn.query('UPDATE hotel_room_types SET images_json = ? WHERE id = ?', [JSON.stringify(tajRoomImgs), 'rt-557253-332']);

  console.log('Successfully updated all hotel and room images in database!');
  await conn.end();
}

run().catch(console.error);
