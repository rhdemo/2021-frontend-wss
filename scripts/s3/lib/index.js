const S3 = require('./s3')
const Bucket = 'summit-game-records'

exports.listObjects = (params) => {
  return S3.listObjects({
    Bucket
  }).promise()
}

exports.getObject = (Key) => {
  if (!Key) {
    console.error('Please pass a key to fetch, e.g:')
    console.error('node scripts/s3/fetch.by-key.js 2021-02-23T17:34:32.857Z.json')
    process.exit(1)
  }

  return S3.getObject({
    Bucket,
    Key
  }).promise()
}
