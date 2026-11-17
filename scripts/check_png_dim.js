const fs = require('fs');
const buf = fs.readFileSync('C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d/.user_uploaded/media_1794567162204_2b07f1ae.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log('Dimensions:', width, 'x', height);

