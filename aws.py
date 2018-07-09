import httplib
import os
import boto3
import json

from log_cfg import logger

s3 = boto3.resource('s3')

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


def normalize(event, context):
	logger.debug('event: {}'.format(event))
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

	return {'statusCode': httplib.OK}