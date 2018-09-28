import { IEpisode, IJob } from '@boombox/shared/src/types/models'
import * as AWS from 'aws-sdk'
import { ENV } from '../../../constants'
import { jobLambda, transcoderInput } from '../../../utils/lambda'
import { buildFilename, getFileInfo } from '../../../utils/s3'

const transcribe = new AWS.TranscribeService()

const transcribeAudioSegment = async (
  episode: IEpisode,
  job: IJob,
  message: any,
  env: { [id: string]: any }
) => {
  if (!job.info.splitAudioFiles) {
    throw Error(
      'The current job info object does not contain the filenames of the original' +
        `audio. ${JSON.stringify(job, null, 2)}`
    )
  }

  const transcribeJobs = []

  for (const splitAudio of job.info.splitAudioFiles) {
    const uri = `https://s3-'${env[ENV.REGION]}.amazonaws.com/${
      env[ENV.INPUT_BUCKET]
    }/${splitAudio}`

    const filenameParts = getFileInfo(splitAudio)

    if (filenameParts.startTime !== undefined) {
      const jobName = buildFilename(episode, job, {
        separator: '__',
        startTime: filenameParts.startTime,
      })
      await transcribe
        .startTranscriptionJob({
          LanguageCode: 'en-US',
          Media: { MediaFileUri: uri },
          MediaFormat: 'mp3',
          MediaSampleRateHertz: 44100,
          OutputBucketName: env[ENV.OUTPUT_BUCKET],
          Settings: {
            MaxSpeakerLabels: 2,
            ShowSpeakerLabels: true,
          },
          TranscriptionJobName: jobName,
        })
        .promise()
      transcribeJobs.push(jobName)
      console.log(`Started transcription job for ${splitAudio}.`)
    } else {
      throw Error(`No start time found in the filename for ${splitAudio}.`)
    }
  }

  return {
    awsTranscribeJobs: transcribeJobs,
  }
}

export const handler = jobLambda(transcribeAudioSegment, {
  input: transcoderInput,
})
