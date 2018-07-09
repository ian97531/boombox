import httplib
import os
import boto3
import json

from log_cfg import logger

s3 = boto3.resource('s3')

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

	return {'statusCode': httplib.OK}