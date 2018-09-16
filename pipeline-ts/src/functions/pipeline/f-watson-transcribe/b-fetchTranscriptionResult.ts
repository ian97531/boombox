// import AWS = require('aws-sdk')
import { lambda } from 'utils/lambda'

const fetchTranscriptionResults = async (event: any, env: { [id: string]: any }) => {
  console.log('success')
}

export const handler = lambda(fetchTranscriptionResults)
