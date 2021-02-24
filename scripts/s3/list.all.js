const S3 = require('./s3')
const Bucket = 'summit-game-records'

function listObjects (params) {
  return S3.listObjects({
    Bucket
  }).promise()
}

async function main () {
  const results = await listObjects()

  console.log('Game Records:\n')
  results.Contents.forEach((item) => {
    console.log(item.Key)
  })
}

main()
