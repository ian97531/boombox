import httplib
import os
import boto3
import botocore
import json
import datetime
import uuid

from pynamodb.exceptions import DoesNotExist
from functions.utils.pynamodb_models import EpisodeModel
from functions.utils.log_cfg import logger

s3 = boto3.resource('s3')
sns = boto3.resource('sns')
transcribeService = boto3.client('transcribe')

class Speakers():
	segment = 0
	item = 0
	data = None

	def __init__(self, data):
		self.data = data["results"]["speaker_labels"]["segments"]

	def getNextSpeaker(self):
		while self.item >= len(self.data[self.segment]["items"]):
			self.segment = self.segment + 1
			self.item = 0

		speaker = self.data[self.segment]["items"][self.item]
		self.item = self.item + 1

		return int(speaker["speaker_label"].replace('spk_', ''))


def getSafeGUID(guid):
	strArray = []
	keepCharacters = ('_', '-', '.')
	for c in guid:
		if c.isalnum() or c in keepCharacters:
			strArray.append(c)
		else:
			strArray.append('-')

	return "".join(strArray).rstrip()

def dateconverter(o):
    if isinstance(o, datetime.datetime):
        return o.__str__()

def transcribe(event, context):
	logger.debug(json.dumps(event))

	logger.debug('boto3 version: ' + boto3.__version__)
	logger.debug('botocore version: ' + botocore.__version__)

	REGION = os.environ['REGION']
	INPUT_BUCKET = os.environ['INPUT_BUCKET']
	OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']

	for record in event['Records']:
		message = json.loads(record['Sns']['Message'])
		for output in message['outputs']:
			key = output['key']
			uri = 'https://s3-' + REGION + '.amazonaws.com/' + INPUT_BUCKET + '/' + key 
			jobName = key.split('.')[0]
			response = transcribeService.start_transcription_job(
				TranscriptionJobName=str(uuid.uuid4()) + '-' + getSafeGUID(jobName),
				LanguageCode='en-US',
				MediaSampleRateHertz=44100,
				MediaFormat='mp3',
				Media={
					'MediaFileUri': uri
				},
				OutputBucketName=OUTPUT_BUCKET,
				Settings={
					'ShowSpeakerLabels': True,
					'MaxSpeakerLabels': 2
				}
			)
			logger.debug('Started Transcriptions job\n ' + json.dumps(response, default=dateconverter))


def normalize(event, context):
	logger.debug(json.dumps(event))

	COMPLETE_TOPIC = os.environ['COMPLETE_TOPIC']
	topic = sns.Topic(COMPLETE_TOPIC)

	for record in event['Records']:
		input_file_name = record['s3']['object']['key']
		input_bucket = record['s3']['bucket']['name']

		if input_file_name != '.write_access_check_file.temp':
			logger.info('Starting fetching input JSON file "' + input_file_name + '" from bucket "' + input_bucket + '".')
			input_object = s3.Object(input_bucket, input_file_name)
			response = input_object.get()
			logger.info('Completed fetching input JSON file "' + input_file_name + '" from bucket "' + input_bucket + '".')

			logger.info('Starting reading JSON from file.')
			file_content = response['Body'].read().decode('utf-8')
			json_content = json.loads(file_content)
			logger.info('Completed reading JSON from file.')

			output_json = []
			items = json_content["results"]["items"]
			speaker_data = Speakers(json_content)
			num_words = 0
			num_punctuation = 0

			logger.info('Starting processing of ' + str(len(items)) + ' recognized items.')

			for item in items:
				if item["type"] == "pronunciation":
					if "confidence" in item["alternatives"][0]:
						speaker = speaker_data.getNextSpeaker()
						output_json.append({
							"word": item["alternatives"][0]["content"],
							"confidence": float(item["alternatives"][0]["confidence"]),
							"start_time": float(item["start_time"]),
							"end_time": float(item["end_time"]),
							"speaker": speaker
						})
						num_words = num_words + 1
					else:
						num_punctuation = num_punctuation + 1
				else:
					num_punctuation = num_punctuation + 1

			logger.info('Completed processing of ' + str(num_words) + ' words and ' + str(num_punctuation) + ' punctuation.')
			
			output_bucket = os.environ["OUTPUT_BUCKET"]
			logger.info('Starting writing JSON to  "' + input_file_name + '" in bucket "' + output_bucket + '".')
			output_file = s3.Object(output_bucket, input_file_name)
			output_file.put(Body=json.dumps(output_json))
			logger.info('Completed writing JSON to  "' + input_file_name + '" in bucket "' + output_bucket + '".')

			guid = input_file_name.split('-')[5]
			logger.debug('Starting updating dynamodb record for ' + guid + '.')
			episode = EpisodeModel.get(hash_key=guid)
			if episode.splitAWSTranscriptions:
				episode.splitAWSTranscriptions.append(input_file_name)
			else:
				episode.splitAWSTranscriptions = [input_file_name]
			episode.save()
			logger.debug('Completed updating dynamodb record for ' + guid + '.')

			if len(episode.splitAWSTranscriptions) == len(episode.splits):
				message = {
					'files': [],
					'guid': guid
				}
				for key in episode.splitAWSTranscriptions:
					message['files'].append(key)
				logger.debug('Sending ' + json.dumps(message) + '\n to the AWS normalization complete SNS.')
				response = topic.publish(Message=json.dumps({'default': json.dumps(message)}), MessageStructure='json')
				logger.debug('Sent message to AWS normalization complete SNS ' + json.dumps(response))
		else:
			logger.info('Skipping processing of file "' + input_file_name + '" from bucket "' + input_bucket + '".')
