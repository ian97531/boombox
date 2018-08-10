# Boombox Pipeline
A  series of Lambda functions that periodically check podcast RSS feeds, downloads any new episodes, and transcribes and preps the episode to be used by the front-end app.

## Development Setup

1. Checkout this repository to your machine:
 ```
 git clone https://github.com/ian97531/boombox.git
 ```
2. Open your terminal and cd the pipeline directory in the repo.
3. Install the [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/quick-start/):
```
npm install -g serverless
```
4. Install the node dependencies:
```
npm install
```
5. Obtain an AWS access key and secret from Ian.  Use these credentials to set up your local Serverless credentials ([link](https://serverless.com/framework/docs/providers/aws/guide/credentials/)):
```
serverless config credentials --provider aws --key [ACCESS KEY] --secret [SECRET]
```
6. Install Homebrew:
```
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```
7. Update your PATH in  `~/.profile` to include Homebrew’s bin directory by adding the line:
```
export PATH="/usr/local/bin:/usr/local/sbin:$PATH"
```
8. Install python 2.7:
```
brew install python@2
```
9. Install the python requirements for the pipeline:
```
pip install -r ./requirements.txt
```
10. Do a test deploy:
```
sls deploy
```

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
1. Messages sent to the `split-complete` SNS topic in the previous section cause the `aws-transcribe` Lambda to execute. This Lambda creates a new transcription job with the AWS Transcribe service. The name of the job is generated as follows: `[new guid]-[episode id]-[start time of segment]`. This job name is used to name the json file that results from the transcription. The resulting transcription files are placed into the `aws-raw-transcriptions` S3 bucket.
2. The `aws-raw-transcriptions` S3 bucket emits a `s3:ObjectCreated:*` event anytime a file is added to the bucket. This event initiates the `aws-normalize` Lambda. This Lambda:
	1. Loads the raw AWS transcription JSON file.
	2. Converts it into a normalized format. See [here](https://raw.githubusercontent.com/ian97531/boombox/master/pipeline/docs/sample-data/normalized/HI-106-0.json?token=ABH0wm1UY8uXGtXGji0xIBbnYCsgsFLUks5bdzy8wA%3D%3D). 
	3. Saves the normalized json back to the `aws-normalized-transcriptions` S3 bucket with the same filename as the input file.
	4. Updates the episode’s DynamoDB record. It adds the newly created filename to the `splitAWSTranscriptions` array field.
	5. If the number of transcriptions listed int the episode record’s `splitAWSTranscriptions` array field matches the number of splits listed in that record’s `splits` array field (this field was populated by the `podcast-split` Lambda), then it publishes a message to the `aws-normalize-complete` SNS topic. With the complete set of transcribe files that must be combined to re-assemble the full episode. Messages on this topic initiate the `aws-zip` Lambda.
3. When a message is published to the `aws-normalize-complete` SNS topic, it triggers the `aws-zip` Lambda. This Lambda 
	1. Uses the overlapping split segments to re-assemble a single, complete transcription for the entire episode.
	2. It saves the resulting json file (with a filename `[episode guid].json` ) to the S3 bucket `aws-zipped-transcriptions`.
	3. It updates the episode record’s `awsTranscription` field with the filename of the newly created json file.
	4. If the episode record’s `watsonTranscription` field is already populated, it publishes a message on the `zip-complete` SNS topic. Messages on this topic initiate the `normalized-combine` Lambda.
### Transcribe the audio files using IBM’s Watson Speech-to-Text Service and post-process the results into a normalized format.
1. Messages sent to the `split-complete` SNS topic in the “Prepare the episode audio” section cause the `watson-transcribe` Lambda to execute. This Lambda:
	1. Registers the Watson Speech-to-Text callback URL, if it’s not already registered.
	2. Creates a new transcription job with the Watson Speech-to-text service and streams an upload from S3 of each of the split audio files referenced by the `split-complete` message.
2. When the Watson Speech-to-Text transcription service finishes transcribing or encounters an error, it’ll POST an HTTP request to the boombox.bingo/dev/watson API endpoint. The API Gateway that services this endpoint will initiate the `download` Lambda. This Lambda:
	1. Streams a download of the transcription JSON to the `watson-raw-transcriptions` if the HTTP callback included the `recognitions.complete` status update. The resulting file has a name with the following format `[guid]-[episode id]-[start time].json`.
	2. Publish a message to the `watson-download-complete` SNS topic. This initiates the `watson-normalize` Lambda function.
3. Messages published to the `watson-download-complete` SNS topic initiates the `aws-normalize` Lambda. This Lambda:
	1. Loads the raw Watson transcription JSON file.
	2. Converts it into a normalized format. See [here](https://raw.githubusercontent.com/ian97531/boombox/master/pipeline/docs/sample-data/normalized/HI-106-0.json?token=ABH0wm1UY8uXGtXGji0xIBbnYCsgsFLUks5bdzy8wA%3D%3D). 
	3. Saves the normalized json back to the `watson-normalized-transcriptions` S3 bucket with the same filename as the input file.
	4. Updates the episode’s DynamoDB record. It adds the newly created filename to the `splitWatsonTranscriptions` array field.
	5. If the number of transcriptions listed int the episode record’s `splitWatsonTranscriptions ` array field matches the number of splits listed in that record’s `splits` array field (this field was populated by the `podcast-split` Lambda), then it publishes a message to the `watson-normalize-complete` SNS topic. With the complete set of transcribe files that must be combined to re-assemble the full episode. Messages on this topic initiate the `watson-zip` Lambda.
4. When a message is published to the `watson-normalize-complete` SNS topic, it triggers the `watson-zip` Lambda. This Lambda 
	1. Uses the overlapping split segments to re-assemble a single, complete transcription for the entire episode.
	2. It saves the resulting json file (with a filename `[episode guid].json` ) to the S3 bucket `watson-zipped-transcriptions`.
	3. It updates the episode record’s `watsonTranscription` field with the filename of the newly created json file.
	4. If the episode record’s `awsTranscription` field is already populated, it publishes a message on the `zip-complete` SNS topic. Messages on this topic initiate the `normalized-combine` Lambda.

### Combine both AWS and Watson transcriptions to produce a higher accuracy transcription.
1. Messages sent to the `normalized-combine` SNS topic in the previous two sections cause the `normalize-combine` Lambda to execute. This Lambda:
	1. Loads the AWS and Watson transcriptions for the episode. It combines the two transcriptions favoring AWS’s word choices and Watson’s speaker choices.
	2. It saves the resulting file (with a filename format of `[episode guid].json`) to the `combined-transcriptions` S3 bucket.

### Store the results to a DynamoDB table.
Coming soon

![Pipeline Diagram](https://github.com/ian97531/boombox/blob/master/pipeline/docs/Transcription%20Pipeline.png)

## AWS Services (currently in use)
### [API Gateway](https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis)
Amazon API Gateway is an AWS service that enables developers to create, publish, maintain, monitor, and secure APIs at any scale.

Requests to API endpoints defined in API Gateway can be integrated with other AWS services. Our API Gateway forwards requests to our Lambda functions.

The boombox pipeline exposes two API endpoints:
* GET `/watson` - The IBM Watson Speech-to-Text Service uses an HTTP callback to inform the Boombox pipeline of status updates (errors and completion) when it’s processing a transcription job. This endpoint is used during the HTTP callback URL registration process. Watson uses the endpoint to verify that that the provided URL will accept callbacks.
* POST `/watson` - The IBM Watson Speech-to-Text Service sends HTTP requests to this endpoint to provide status updates (errors and completion) about transcriptions jobs that have been started by the boombox pipeline.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Certificate Manager](https://console.aws.amazon.com/acm/home?region=us-east-1#/)
AWS Certificate Manager handles the complexity of creating and managing public SSL/TLS certificates for your AWS based websites and applications.

We use the Certificate Manager to create and manage our *.boombox.bingo SSL certificate.

### [CloudFormation](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks?filter=active)
AWS CloudFormation enables you to create and provision AWS infrastructure deployments predictably and repeatedly by capturing all of the configuration information in document that can be version controlled.

The Serverless Framework automatically generates a CloudFormation config file each time you run `sls deploy`.  You generally don’t need to worry about this service, unless you’d like to delete and re-deploy the entirety of the boombox pipeline. The CloudFormation web console can be used to delete all pipeline AWS resources. Running  `sls deploy` will set everything up from scratch once again.

### [CloudWatch](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#)
Amazon CloudWatch provides a reliable, scalable, and flexible monitoring solution that you can start using within minutes. You no longer need to set up, manage, and scale your own monitoring systems and infrastructure.

All of the boombox pipeline Lambdas write there log files into Cloudwatch.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [DynamoDB](https://console.aws.amazon.com/dynamodb/home?region=us-east-1#)
Amazon DynamoDB is a fully managed  [NoSQL database](https://aws.amazon.com/nosql/)  service that provides fast and predictable performance with seamless scalability. You can use Amazon DynamoDB to create a database table that can store and retrieve any amount of data, and serve any level of request traffic. Amazon DynamoDB automatically spreads the data and traffic for the table over a sufficient number of servers to handle the request capacity specified by the customer and the amount of data stored, while maintaining consistent and fast performance.

The boombox pipeline uses DynamoDB tables to store information about each podcast, episode, and transcribed sentence.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Elastic Transcoder Service](https://console.aws.amazon.com/elastictranscoder/home?region=us-east-1#)
Amazon Elastic Transcoder lets you convert media files that you have stored in Amazon S3 into media files in the formats required by consumer playback devices. For example, you can convert large, high-quality digital media files into formats that users can play back on mobile devices, tablets, web browsers, and connected televisions.

We use the Elastic Transcode Service to convert the incoming mp3 audio for podcast episodes into m4a and ogg formats. This process also informs the pipeline of the duration of the audio file which is needed to ensure that the pipeline doesn’t attempt to transcribe more than 55 minutes of audio at once (both AWS Transcribe and IBM Watson Speech-to-Text have limits on how much audio they can transcribe at once). 

We also use the Elastic Transcode Service to split the original audio files into smaller segments of 55 min or less.

### [IAM](https://console.aws.amazon.com/iam/home?region=us-east-1#/home)
AWS Identity and Access Management (IAM) is a web service for securely controlling access to AWS services. With IAM, you can centrally manage users, security credentials such as access keys, and permissions that control which AWS resources users and applications can access.

Each service used by the boombox pipeline is granted the minimum permissions it needs (to other resources and actions within those resources) in order to complete it’s task. 

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Lambda](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions)
With AWS Lambda, you can run code without provisioning or managing servers. You pay only for the compute time you consume—there’s no charge when your code isn’t running. You can run code for virtually any type of application or backend service—all with zero administration. Just upload your code and Lambda takes care of everything required to run and scale your code with high availability. You can set up your code to automatically trigger from other AWS services or call it directly from any web or mobile app.

The boombox pipeline uses Python Lambdas for all computational tasks that are not handled by the other AWS services.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Route53](https://console.aws.amazon.com/route53/home?region=us-east-1#)
Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service. 

We use this service to handle the DNS services for the *.boombox.bingo domains.

### [S3](https://s3.console.aws.amazon.com/s3/home?region=us-east-1)
Amazon Simple Storage Service (Amazon S3) is storage for the Internet. You can use Amazon S3 to store and retrieve any amount of data at any time, from anywhere on the web.

S3 is used by the boombox pipeline to permanently store the original audio files, transcoded audio files, split audio files, transcription results, normalized transcriptions, zipped transcriptions, and combined transcriptions for each episode processed.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Secrets Manager](https://console.aws.amazon.com/secretsmanager/home?region=us-east-1#/listSecrets)
AWS Secrets Manager helps you to securely encrypt, store, and retrieve credentials for your databases and other services. Instead of hardcoding credentials in your apps, you can make calls to Secrets Manager to retrieve your credentials whenever needed.

The boombox pipeline uses this service to store and retrieve the IBM Watson Speech-to-Text service account credentials so that we can avoid storing them in our codebase and exposing them via Github.

### [SNS](https://console.aws.amazon.com/sns/v2/home?region=us-east-1#/home)
Amazon Simple Notification Service (Amazon SNS) is a web service that enables applications, end-users, and devices to instantly send and receive notifications from the cloud.

The Lambda functions in the boombox pipeline use SNS to communicate between functions and to initiate the next step in the pipeline.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Transcribe Service](https://console.aws.amazon.com/transcribe/home?region=us-east-1#jobs)
Amazon Transcribe provides transcription services for your audio files. It uses advanced machine learning technologies to recognize spoken words and transcribe them into text.

The boombox pipeline uses both the Amazon Transcribe service and the IBM Watson Speech-to-Text transcription service to build it’s transcriptions. It does this because Amazon has great word recognition, but poor speaker recognition and Watson has great speaker recognition, but poor word recognition. AWS Transcribe will only process audio files that are < 2 hours in length.

## IBM Watson Services (currently in use)
### [Speech-To-Text](https://console.bluemix.net/docs/services/speech-to-text/getting-started.html#gettingStarted)
The IBM® Speech to Text service provides an API that uses IBM’s speech-recognition capabilities to produce transcripts of spoken audio. The service can transcribe speech from various languages and audio formats. It addition to basic transcription, the service can produce detailed information about many aspects of the audio. For most languages, the service supports two sampling rates, broadband and narrowband.

The boombox pipeline uses both the Amazon Transcribe service and the IBM Watson Speech-to-Text transcription service to build it’s transcriptions. It does this because Amazon has great word recognition, but poor speaker recognition and Watson has great speaker recognition, but poor word recognition. IBM Watson Speech-to-Text will only process audio files that are < 100MB in size.

The boombox pipeline service account credentials can be found [here](https://console.bluemix.net/services/speech-to-text/3676b210-8219-484a-a112-b94748a9201e?paneId=credentials&ace_config=%7B%22region%22%3A%22us-south%22%2C%22orgGuid%22%3A%223fb82e14-1bf5-4c81-802a-20bbdb4aa20e%22%2C%22spaceGuid%22%3A%22807550c6-17b2-43da-a3fd-2b9c9a5342a8%22%2C%22redirect%22%3A%22https%3A%2F%2Fconsole.bluemix.net%2Fdashboard%2Fapps%2F%22%2C%22bluemixUIVersion%22%3A%22v6%22%2C%22crn%22%3A%22crn%3Av1%3Abluemix%3Apublic%3A%3Aus-south%3As%2F807550c6-17b2-43da-a3fd-2b9c9a5342a8%3A3676b210-8219-484a-a112-b94748a9201e%3Acf-service-instance%3A%22%2C%22id%22%3A%223676b210-8219-484a-a112-b94748a9201e%22%7D&env_id=ibm%3Ayp%3Aus-south).

## Third party services that might come in useful
### [AWS Aurora Serverless](https://aws.amazon.com/rds/aurora/serverless/)
Aurora Serverless is an on-demand, auto-scaling configuration for Aurora (MySQL-compatible edition) where the database will automatically start-up, shut down, and scale up or down capacity based on your application’s needs. Aurora Serverless enables you to run your database in the cloud without managing any database instances. It’s a simple, cost-effective option for infrequent, intermittent, or unpredictable workloads, because it automatically starts up, scales capacity to match your application’s usage, and shuts down when not in use.

This service is very new and makes it easy for us to access a relational database (rather than DynamoDB) from Lambdas without worrying about swamping the DB, or administering a DB server(s).

### [AWS CloudFront](https://aws.amazon.com/documentation/cloudfront/?id=docs_gateway)
Amazon CloudFront is a CDN service that speeds up distribution of your static and dynamic web content, for example, .html, .css, .php, image, and media files, to end users. CloudFront delivers your content through a worldwide network of edge locations. When an end user requests content that you’re serving with CloudFront, the user is routed to the edge location that provides the lowest latency, so content is delivered with the best possible performance.

This service works well with Lambda and S3 allowing us to geographically distribute out compute instances in addition to our static assets.

### [AWS Comprehend](https://console.aws.amazon.com/comprehend/v2/home?region=us-east-1#welcome)
**Description:** Amazon Comprehend can discover the meaning and relationships in text from customer support incidents, product reviews, social media feeds, news articles, documents, and other sources.
Amazon Comprehend can analyze a collection of documents or other text files, such as social media posts, and automatically organize them by relevant terms or topics. You can use the topics to deliver personalized content to your customers, or to provide richer search and navigation.
This service identifies Entities (proper nouns), Key Phrases, Language, Sentiment, and Topics.

**Possible Uses:** 
* Identifying conversation topics.
* Differentiating ads from content in a podcast.
* Identifying particularly emotional areas of the podcast.

### [IBM Watson Natural Language Classifier](https://www.ibm.com/cloud/watson-natural-language-classifier)
**Description:** Natural Language Classifier returns the best matching classes for a sentence or phrase. For example, you submit a question and it returns keys to the best matching answers or next actions for your app.
Understand the intent behind text and returns a corresponding classification, complete with a confidence score.

**Possible Uses:** 
* Identifying conversation topics.
* Differentiating ads from content in a podcast.

### [IBM Watson Natural Language Understanding](https://www.ibm.com/cloud/watson-natural-language-understanding)
**Description:** Analyze text to extract metadata from content such as concepts, entities, keywords, categories, sentiment, emotion, relations, and semantic roles using natural language understanding.

### [IBM Watson Tone Analyzer](https://www.ibm.com/cloud/watson-tone-analyzer)
**Description:** The IBM Watson™ Tone Analyzer service uses linguistic analysis to detect emotion, language tones, and sentiment in written text.

### [IBM Watson Personality Insights](https://www.ibm.com/cloud/watson-personality-insights)
Predict personality characteristics, needs, and values via written text. Understand habits and preferences on an individual level.