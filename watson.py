import httplib
import os
import boto3
import json

from watson_developer_cloud import SpeechToTextV1
from log_cfg import logger

s3 = boto3.resource('s3')

CHALLENGE_STRING = 'challenge_string'
QUERY_STRING = 'queryStringParameters'

def transcribe(event, context):
	logger.debug(json.dumps(event))

	INPUT_BUCKET = os.environ['INPUT_BUCKET']
	WATSON_CALLBACK_URL = os.environ['WATSON_CALLBACK_URL']
	WATSON_USERNAME = os.environ['WATSON_USERNAME']
	WATSON_PASSWORD = os.environ['WATSON_PASSWORD']

	for record in event['Records']:
		message = json.loads(record['Sns']['Message'])
		for output in message['outputs']:
			key = output['episode']
			episode = key.split('.')[0]

			download_path = '/tmp/{}{}'.format(uuid.uuid4(), key)
			logger.debug('Started downloading audio file "' + key + '" to "' + download_path + '".')
			
			audio_object = s3.Object(INPUT_BUCKET, key)
			audio_object.download_file(download_path)
			logger.debug('Completed downloading audio file "' + key + '" to "' + download_path + '".')

			logger.info('Starting Recognition job.')
			speech_to_text = SpeechToTextV1(
				username=WATSON_USERNAME,
				password=WATSON_PASSWORD)

			with open(download_path,'rb') as audio_file:
				recognition_job = speech_to_text.create_job(
					audio_file,
					'audio/mp3',
					callback_url=WATSON_CALLBACK_URL,
					user_token=episode,
					timestamps=True,
					word_confidence=True,
					speaker_labels=True,
					smart_formatting=True,
					inactivity_timeout=-1)
			logger.info('Started Recognition job: ' + json.dumps(recognition_job))

def verify(event, context):
	logger.debug(json.dumps(event))

	response = {
		"statusCode": 400
	}

	if CHALLENGE_STRING in event[QUERY_STRING]:
		response = {
			"statusCode": 200,
			"headers": {
				"Content-Type" : "text/plain"
			},
			"body": event[QUERY_STRING][CHALLENGE_STRING]
		} 

	return response


def download(event, context):
	logger.debug(json.dumps(event))


def normalize(event, context):
	logger.debug(json.dumps(event))
	input_file_name = event['Records'][0]['s3']['object']['key']
	input_bucket = event['Records'][0]['s3']['bucket']['name']

	logger.info('Starting fetching input JSON file "' + input_file_name + '" from bucket "' + input_bucket + '".')
	input_object = s3.Object(input_bucket, input_file_name)
	response = input_object.get()
	logger.info('Completed fetching input JSON file "' + input_file_name + '" from bucket "' + input_bucket + '".')

	logger.info('Starting reading JSON from file.')
	file_content = response['Body'].read().decode('utf-8')
	json_content = json.loads(file_content)
	logger.info('Completed reading JSON from file.')

	output_json = []
	items = json_content["results"]
	speaker_index = 0
	total_words = 0

	logger.info('Starting processing of an unknown number of recognized items.')
	for item in items:
		word_confidences = item["alternatives"][0]["word_confidence"]
		timings = item["alternatives"][0]["timestamps"]
		index = 0
		for word in word_confidences:
			word_output = {
				"word": word[0],
				"confidence": word[1],
				"start_time": timings[index][1],
				"end_time": timings[index][2]
			}

			index = index + 1

			if 'speaker_labels' in json_content:
				speaker = json_content["speaker_labels"][speaker_index]["speaker"]
				word_output["speaker"] = speaker
				speaker_index = speaker_index + 1

			total_words = total_words + 1
			output_json.append(word_output)

	logger.info('Completed processing of ' + str(total_words) + ' words.')
	
	output_bucket = os.environ["OUTPUT_BUCKET"]
	logger.info('Starting writing JSON to  "' + input_file_name + '" in bucket "' + output_bucket + '".')
	output_file = s3.Object(output_bucket, input_file_name)
	output_file.put(Body=json.dumps(output_json))
	logger.info('Completed writing JSON to  "' + input_file_name + '" in bucket "' + output_bucket + '".')

def zip(event, context):
	logger.debug(json.dumps(event))