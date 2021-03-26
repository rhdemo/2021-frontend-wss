const { getObject } = require('./lib')

async function main () {
  const result = await getObject(process.argv[2])

  console.log(result.Body.toString())
}

main()
