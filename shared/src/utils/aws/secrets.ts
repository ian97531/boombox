import * as AWS from 'aws-sdk'

const secretManager = new AWS.SecretsManager()

export const getSecret = async (key: string): Promise<any> => {
  let secret: any
  const response = await secretManager.getSecretValue({ SecretId: key }).promise()
  if (response && response.SecretString) {
    secret = JSON.parse(response.SecretString)
  } else {
    throw Error(`Key '${key}' not found in AWS Secret Manager.`)
  }

  return secret
}
