import { eventContext } from 'aws-serverless-express/middleware'
import { json, urlencoded } from 'body-parser'
import cors = require('cors')
import express = require('express')

import podcasts from './endpoints/podcasts'
import { Forbidden } from './errors'
import { handleErrors, handleNotFound } from './middleware'

const app: express.Application = express()

const domainName = process.env.DOMAIN_NAME
const whitelist = [
  'https://' + domainName,
  'https://www-test.' + domainName,
  'https://www-ian.' + domainName,
  'https://www-andrew.' + domainName,
  'http://localhost:3000',
]
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || origin === undefined) {
      callback(null, true)
    } else {
      callback(new Forbidden('Not allowed by CORS'))
    }
  },
}

app.use(cors(corsOptions))
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(eventContext())

app.use('/podcasts', podcasts())
app.use(handleNotFound)
app.use(handleErrors)

export default app
