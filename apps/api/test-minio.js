const Minio = require('minio');
const client = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin123'
});

async function run() {
  try {
    const buckets = await client.listBuckets();
    console.log('Buckets:', buckets);
    const url = await client.presignedGetObject('food-expenses', 'test.jpg', 600);
    console.log('Presigned URL:', url);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
