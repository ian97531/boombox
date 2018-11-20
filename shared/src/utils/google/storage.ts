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
  if (storage === undefined) {
    const credentials = await getGoogleCredentials()
    storage = new Storage({ credentials })
  }
  const destinationFilename = outputFilename ? outputFilename : inputFilename
  const bucket = storage.bucket(outputBucket)
  const file = bucket.file(destinationFilename)
  const stream = getFileStream(inputBucket, inputFilename).pipe(file.createWriteStream())
  return new Promise<void>((resolve, reject) => {
    stream.on('error', (err: Error) => {
      console.error(
        `Unable to write s3://${inputBucket}/${inputFilename} to gcp://${outputBucket}/${destinationFilename}.`
      )
      reject(err)
    })
    stream.on('finish', () => {
      resolve()
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
