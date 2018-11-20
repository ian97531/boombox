import * as AWS from 'aws-sdk'

const elasticTranscoder = new AWS.ElasticTranscoder()

export const enum AWS_TRANSCODE_PRESETS {
  M4A = '1351620000001-100120', // M4A AAC 160 44k
  MP3 = '1351620000001-300030', // MP3 160 44k
  OGG = '1531717800275-2wz911', // OGG Vorbis 160 44k
  FLAC_STEREO = '1351620000001-300110',
  FLAC_MONO = '1542697787049-hf0s4v', // FLAC, 1 channel
}

export const createJob = async (
  pipelineId: string,
  inputFilename: string,
  outputFilename: string,
  outputBucket: string,
  startTime: number,
  duration: number,
  format: AWS_TRANSCODE_PRESETS = AWS_TRANSCODE_PRESETS.FLAC_MONO
): Promise<void> => {
  const jobInput = {
    Key: inputFilename,
    TimeSpan: {
      Duration: duration.toString(),
      StartTime: startTime.toString(),
    },
  }
  const jobOutput = { Key: outputFilename, PresetId: format }
  const params = { Input: jobInput, Output: jobOutput, PipelineId: pipelineId }

  let response

  response = await elasticTranscoder.createJob(params).promise()

  if (!response.Job || !response.Job.Id) {
    throw Error(
      'No job created by ElasticTranscoder.createSegmentJob for params' +
        JSON.stringify(params, null, 2)
    )
  }
}
