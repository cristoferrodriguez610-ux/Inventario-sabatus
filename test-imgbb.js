const https = require('https');

const options = {
  hostname: 'i.ibb.co',
  path: '/Wpj5KC4w/188251.jpg',
  method: 'GET',
  headers: {
    'Referer': ''
  }
};

const req = https.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
});

req.on('error', error => {
  console.error(error);
});

req.end();
