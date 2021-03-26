const { listObjects } = require('./lib')

async function main () {
  const results = await listObjects()

  console.log('Game Records:\n')
  results.Contents.forEach((item) => {
    console.log(item.Key)
  })
}

main()
