# Boombox Pipeline
---
A  series of Lambda functions that periodically check podcast RSS feeds, downloads any new episodes, and transcribes and preps the episode to be used by the front-end app.

## Development Setup
---

1. Checkout this repository to your machine:
 `git clone https://github.com/ian97531/boombox.git`
2. Open your terminal and cd the pipeline directory in the repo.
3. Install the [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/quick-start/):
`npm install -g serverless`
4. Install the node dependencies:
`npm install`
5. Obtain an AWS access key and secret from Ian.  Use these credentials to set up your local Serverless credentials ([link](https://serverless.com/framework/docs/providers/aws/guide/credentials/)):
`serverless config credentials --provider aws --key [ACCESS KEY] --secret [SECRET]`
6. Install Homebrew:
`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
7. Update your PATH in  `~/.profile` to include Homebrew’s bin directory by adding the line:
`export PATH="/usr/local/bin:/usr/local/sbin:$PATH"`
8. Install python 2.7:
`brew install python@2`
9. Install the python requirements for the pipeline:
`pip install -r ./requirements.txt`
10. Do a test deploy:
`sls deploy`

## Pipeline Overview
The pipeline fetches and processes podcast episodes in 6 phases:

1. [Fetch new podcast episodes audio files.](#fetch-new-podcast-episodes-audio-files)
2. [Prepare the episode audio files for transcription.](#prepare-the-episode-audio-files-for-transcription)
3. [Transcribe the audio files using AWS’s Transcribe Service and post-process the results into a normalized format.](transcribe-the-audio-files-using-awss-transcribe-service-and-post-process-the-results-into-a-normalized-format)
4. [Transcribe the audio files using IBM’s Watson Speech-to-Text Service and post-process the results into a normalized format.](transcribe-the-audio-files-using-ibms-watson-speech-to-text-service-and-post-process-the-results-into-a-normalized-format)
5. [Combine both AWS and Watson transcriptions to produce a higher accuracy transcription.](combine-both-aws-and-watson-transcriptions-to-produce-a-higher-accuracy-transcription)
6. [Store the results to a DynamoDB table.](store-the-results-to-a-dynamodb-table)

### Fetch new podcast episode audio files.
1. A CloudWatch event is set to fire every 10 minutes.
2. This event starts the `podcasts-update-from-feed` Lambda. This Lambda:
	1. Downloads the RSS feeds for specific podcasts.
	2. Creates an entry in the `podcasts` DynamoDB table for the podcast with some metadata if an entry doesn’t already exist.
	3. Creates an entry in the `episodes` DynamoDB table for the episode with some metadata if an entry doesn’t already exist.
	4. The `episodes` table has a stream attached. Anytime a new record is inserted, the `podcasts-download`  Lambda.
3. The  `podcasts-download` Lambda:
	1. Finds the URL for the mp3 file of the episode in the DynamoDB stream that initiated the it, and initiates a download that is streamed into the `episode-audio-original` S3 bucket.
	2. Once the download is complete, it publishes a message to the `transcode-pending` SNS topic. This initiates the `podcasts-transcode` Lambda in the next section.

### Prepare the episode audio files for transcription.
1. Messages sent to the `transcode-pending` SNS topic in the previous section cause the `podcasts-transcode` Lambda to execute. This Lambda:
	1. Starts a job in the `transcode` pipeline of the AWS Amazon Elastic Transcoder Service. These jobs transcode the mp3 file into m4a and Ogg Vorbis. Successful completion of the transcode job results in the creation of a new .m4a and .ogg file containing the same audio as the input .mp3 in the `episode-audio-transcoded` S3 bucket. The transcription job also publishes of a message to the `transcode-complete` SNS topic.
2. When a message is published to the `transcode-complete` SNS topic, it triggers the `podcasts-file-permissions` Lambda. This Lambda:
	1. Alters the ACLs of the .mp3, .m4a, and .ogg files in their respective S3 buckets to make them publicly accessible to anyone with the correct URLs.
	2. Stores the public URLs for these audio files in the episode’s record in the `episodes` DynamoDB table.
	3. Stores the duration (in seconds) of the episode audio file in the episode’s record in the `episodes` DynamoDB table as well.
	4. Publishes a message to the `permissions-complete` SNS topic. This initiates the `podcasts-split` Lambda function.
3. When a message is published to the `permissions-complete` SNS topic, it triggers the `podcasts-split` Lambda. This Lambda is responsible for splitting each episode mp3 file into segments less than or equal to 55 minute along with 4 minute segments that overlap each split boundary. This is needed because both the AWS’s and Watson’s Transcription services have limits on the amount of audio they will process. AWS Transcribe will not accept audio files longer than 2 hours in duration. Watson’s Speech-to-Text service will not accept audio files larger than 100MB.  The Lambda:
	1. Uses the duration information obtained from the previous transcode job to calculate the number and start and stop times for each split file.
	2. Starts a job in the `split` pipeline of the AWS Amazon Elastic Transcoder Service that takes the original mp3 file as an input and generates the requested number of output mp3 files in the `episode-audio-splits` S3 bucket. The job still runs if the episode is less than 55 minutes, but only creates a single output file that’s identical to the original mp3 file. The split job also publishes of a message to the `split-complete` SNS topic. This message initiates two Lambdas, one that begins the AWS transcription process (described below) and another that simultaneously begins the Watson transcription process (also described below).
### Transcribe the audio files using AWS’s Transcribe Service and post-process the results into a normalized format.

### Transcribe the audio files using IBM’s Watson Speech-to-Text Service and post-process the results into a normalized format.

### Combine both AWS and Watson transcriptions to produce a higher accuracy transcription.

### Store the results to a DynamoDB table.

![Pipeline Diagram](https://github.com/ian97531/boombox/blob/master/pipeline/docs/Transcription%20Pipeline.png)
