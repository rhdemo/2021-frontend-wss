const { getObject, listObjects } = require('./lib')

async function main () {
  const date = process.argv[2]

  if (!date || !date.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
    console.error('Please provide a date in "YYYY-MM-DD" format as an argument')
    process.exit(1)
  }

  const listing = await listObjects()
  const filtered = listing.Contents.filter(item => item.Key.includes(process.argv[2]))
  const items = await Promise.all(filtered.map(item => getObject(item.Key)))

  const result = items.reduce((counts, item) => {
    const json = JSON.parse(item.Body.toString())

    if (json.winner.isAi){
      counts.ai++
    } else {
      counts.human++
    }

    return counts
  }, {
    ai: 0,
    human: 0
  })

  console.log('Wins by player type:',)
  console.log(JSON.stringify(result, null, 2))
}

main()
