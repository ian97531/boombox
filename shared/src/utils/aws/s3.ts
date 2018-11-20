import * as AWS from 'aws-sdk'
import { Readable } from 'stream'

const s3 = new AWS.S3()

export const checkFileExists = async (bucket: string, filename: string): Promise<boolean> => {
  let exists = false

  const params: AWS.S3.HeadObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }

  try {
    await s3.headObject(params).promise()
    exists = true
  } catch (error) {
    exists = false
  }

  return exists
}

export const deleteFile = async (bucket: string, filename: string) => {
  const params: AWS.S3.DeleteObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }
  return s3.deleteObject(params).promise()
}

export const getFileStream = (bucket: string, filename: string): Readable => {
  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }
  return s3.getObject(params).createReadStream()
}

export const getFile = async <T>(bucket: string, filename: string): Promise<T> => {
  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }
  const response = await s3.getObject(params).promise()
  if (!response.Body) {
    throw Error('No body was returned in the s3 response.')
  }
  return response.Body as T
}

export const putFile = async <T>(bucket: string, filename: string, data: T): Promise<void> => {
  const params: AWS.S3.PutObjectRequest = {
    Body: data,
    Bucket: bucket,
    Key: filename,
  }

  await s3.putObject(params).promise()
}

export const getJsonFile = async <T>(bucket: string, filename: string): Promise<T> => {
  const response = await getFile(bucket, filename)

  return JSON.parse(response.toString())
}

export const putJsonFile = async <T>(bucket: string, filename: string, obj: T): Promise<void> => {
  await putFile(bucket, filename, JSON.stringify(obj, null, 2))
}
