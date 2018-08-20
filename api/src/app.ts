import { eventContext } from 'aws-serverless-express/middleware'
import { json, urlencoded } from 'body-parser'
import cors = require('cors')
import express = require('express')
import statements from './endpoints/statements'
import { handleErrors, handleNotFound } from './middleware'

const app: express.Application = express()
app.use(cors())
app.use(json())
app.use(urlencoded({ extended: true }))
app.use(eventContext())

app.use('/statements', statements())
app.use(handleNotFound)
app.use(handleErrors)

export default app
