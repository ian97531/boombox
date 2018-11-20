import { Storage } from '@google-cloud/storage'
import { IGoogleCredentials } from '../../types/google'
import { getFileStream } from '../aws/s3'
import { getSecret } from '../aws/secrets'

let GOOGLE_CREDENTIALS: IGoogleCredentials
let storage: Storage

const getGoogleCredentials = async (): Promise<IGoogleCredentials> => {
  if (GOOGLE_CREDENTIALS === undefined) {
    const CREDENTIAL_KEY = process.env.GOOGLE_CREDENTIALS as string
    if (CREDENTIAL_KEY === undefined) {
      throw Error('The WATSON_TRANSCRIBE_CREDENTIALS environment variable is undefined.')
    }
    GOOGLE_CREDENTIALS = (await getSecret(CREDENTIAL_KEY)) as IGoogleCredentials
  }
  return GOOGLE_CREDENTIALS
}

export const streamFileFromS3ToGoogleCloudStorage = async (
  inputBucket: string,
  inputFilename: string,
  outputBucket: string,
  outputFilename?: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    getGoogleCredentials().then(credentials => {
      if (storage === undefined) {
        storage = new Storage({ credentials })
      }

      getFileStream(inputBucket, inputFilename).then(readStream => {
        const destinationFilename = outputFilename ? outputFilename : inputFilename
        const myBucket = storage.bucket(outputBucket)
        const file = myBucket.file(destinationFilename)
        console.log('Starting to stream the file from aws to gc storage.')
        readStream
          .pipe(file.createWriteStream())
          .on('error', (err: Error) => {
            console.error(
              `Unable to write s3://${inputBucket}/${inputFilename} to gcp://${outputBucket}/${destinationFilename}.`
            )
            reject(err)
          })
          .on('finish', () => {
            console.log('Completed streaming the file to gc.')
            resolve()
          })
      })
    })
  })
}

export const makeFilePublic = async (bucket: string, filename: string): Promise<void> => {
  if (storage === undefined) {
    const credentials = await getGoogleCredentials()
    storage = new Storage({ credentials })
  }
  const myBucket = storage.bucket(bucket)
  const file = myBucket.file(filename)
  await file.makePublic()
}

export const deleteFile = async (bucket: string, filename: string): Promise<void> => {
  if (storage === undefined) {
    const credentials = await getGoogleCredentials()
    storage = new Storage({ credentials })
  }
  const myBucket = storage.bucket(bucket)
  const file = myBucket.file(filename)
  await file.delete()
}

export const fileExists = async (bucket: string, filename: string): Promise<boolean> => {
  if (storage === undefined) {
    const credentials = await getGoogleCredentials()
    storage = new Storage({ credentials })
  }
  const myBucket = storage.bucket(bucket)
  const file = myBucket.file(filename)
  return await file.exists()[0]
}
