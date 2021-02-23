const AWS = require('aws-sdk')
const env = require('env-var')

require('dotenv').config()

module.exports = new AWS.S3({
  credentials: {
    accessKeyId: env.get('AWS_ACCESS_KEY_ID').required().asString(),
    secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY').required().asString()
  },
  region: 'us-east-1'
})
