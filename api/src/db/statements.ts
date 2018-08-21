import AWS = require('aws-sdk')
import { IStatement } from '../types/models'

AWS.config.update({
  region: 'us-east-1',
})

const dynamo: AWS.DynamoDB = new AWS.DynamoDB({ apiVersion: '2012-10-08' })

interface IQuery {
  guid: string
  startTime: number
  pageSize: number
}

export function queryStatements(
  query: IQuery,
  cb: (error: AWS.AWSError, data: IStatement[]) => void
) {
  console.log('in queryStatements')
  const params: AWS.DynamoDB.QueryInput = {
    ExpressionAttributeValues: {
      ':guid': { S: query.guid },
      ':startTime': { N: query.startTime.toString() },
    },
    KeyConditionExpression: 'guid = :guid and endTime > :startTime',
    Limit: query.pageSize,
    ProjectionExpression: 'startTime, endTime, speaker, words',
    TableName: 'boombox-pipeline-ian-statements',
  }
  dynamo.query(
    params,
    (error: AWS.AWSError, data: AWS.DynamoDB.QueryOutput) => {
      const statements: IStatement[] = data ? prepareQueryResults(data) : []
      cb(error, statements)
    }
  )
}

function prepareQueryResults(data: AWS.DynamoDB.QueryOutput): IStatement[] {
  const items: IStatement[] = []
  if (data.Items) {
    data.Items.forEach((item: AWS.DynamoDB.AttributeMap) => {
      const words = item.words.L || []
      const speakerId = item.speaker.N || '0'
      const startTime = item.startTime.N ? parseFloat(item.startTime.N) : 0
      const endTime = item.endTime.N ? parseFloat(item.endTime.N) : 0

      const statement: IStatement = {
        endTime,
        speaker: {
          avatarURL: 'http://www.avatarmovie.com/index.html',
          id: speakerId,
          isHost: true,
          name: 'CGP Grey',
        },
        startTime,
        words: words.map(wordObj => {
          let wordEndTime = 0
          let wordStartTime = 0
          let content = ''
          if (wordObj.M) {
            const word = wordObj.M
            wordEndTime = word.end_time.N
              ? parseFloat(word.end_time.N)
              : wordEndTime
            wordStartTime = word.start_time.N
              ? parseFloat(word.start_time.N)
              : wordStartTime
            content = word.word.S || content
          }
          return {
            content,
            endTime: wordStartTime,
            startTime: wordEndTime,
          }
        }, []),
      }
      items.push(statement)
    })
  }
  return items
}
