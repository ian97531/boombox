import httplib
import os
import boto3
import botocore
import json

from log_cfg import logger

s3 = boto3.resource('s3')

class Transcription():
	transcriptionJson = None
	index = 0
	name = None

	def __init__(self, transcriptionJson, name):
		self.transcriptionJson = transcriptionJson
		self.name = name

	def getNext(self, distance=1):
		items = self.transcriptionJson[self.index : self.index + distance]
		self.index = self.index + distance
		return items

	def peekNext(self, distance=1):
		items = self.transcriptionJson[self.index : self.index + distance]
		return items


def computeDrift(left, right):
	first1 = left[0]
	last1 = left[len(left) - 1]

	first2 = right[0]
	last2 = right[len(right) - 1]
	
	startDrift = abs(first1["start_time"] - first2["start_time"])
	endDrift = abs(last1["end_time"] - last2["end_time"])

	return startDrift + endDrift


def getBestTimeMatch(left, right, leftDepth=1, rightDepth=1):
	peekLeft = left.peekNext(leftDepth)
	peekRight = right.peekNext(rightDepth)
	currentDrift = computeDrift(left.peekNext(leftDepth), right.peekNext(rightDepth))

	if leftDepth < 8 and rightDepth < 8:
		leftCheck = getBestTimeMatch(left, right, leftDepth + 1, rightDepth)
		rightCheck = getBestTimeMatch(left, right, leftDepth, rightDepth + 1)

		if leftCheck["drift"] < rightCheck["drift"] and leftCheck["drift"] < currentDrift:
			return leftCheck
		elif rightCheck["drift"] < currentDrift:
			return rightCheck
	
	return {
		"drift": currentDrift,
		"leftDepth": leftDepth,
		"rightDepth": rightDepth
	}


def getConfidence(seq):
	items = 0
	confidence = 0

	for item in seq:
		items = items + 1
		confidence = confidence + item["confidence"]

	return confidence/items


def getSpeakerForWord(word, speaker):
	speakers = set()

	leastDriftSpeaker = None
	leastDrift = None

	wordMatchSpeaker = None
	wordMatchDrift = None

	for item in speaker:
		speakers.add(item["speaker"])
		currentDrift = computeDrift([word], [item])
		if not leastDrift or currentDrift < leastDrift: 
			leastDrift = currentDrift
			leastDriftSpeaker = item["speaker"]

		if word["word"].lower() == item["word"].lower() and (not wordMatchDrift or currentDrift < wordMatchDrift):
			wordMatchDrift = currentDrift
			wordMatchSpeaker = item["speaker"]

	if len(speakers) == 1:
		return speakers.pop()
	else:
		return leastDriftSpeaker


def reconcile(winner, loser):
	i = 0
	inMatch = False
	match = True
	for item in loser:
		if i < len(winner) and item["word"].lower() == winner[i]["word"].lower():
			inMatch = True
			i = i + 1
		elif inMatch and i != len(winner):
			match = False

	if i != len(winner):
		match = False

	if match:
		return loser
	else:
		return winner


def processFiles(aws_object, watson_object):
	logger.info('Starting fetching the normalized JSON files.')
	aws_response = aws_object.get()
	logger.info('Completed fetching the normalized AWS JSON file.')
	watson_response = watson_object.get()
	logger.info('Completed fetching the normalized Watson JSON file.')

	logger.info('Starting reading JSON from files.')
	aws_file_content = aws_response['Body'].read().decode('utf-8')
	aws_json_content = json.loads(aws_file_content)
	logger.info('Completed reading JSON from the AWS file.')
	watson_file_content = watson_response['Body'].read().decode('utf-8')
	watson_json_content = json.loads(watson_file_content)
	logger.info('Completed reading JSON from the Watson file.')

	output_json = []
	left = Transcription(watson_json_content, "Watson")
	right = Transcription(aws_json_content, "Amazon")


	logger.info('Starting processing of an unknown number of recognized items.')
	while True:
		word1 = left.peekNext()
		word2 = right.peekNext()

		if len(word1) == 0 or len(word2) == 0:
			break 

		if word1[0]["word"].lower() == word2[0]["word"].lower():
			left.getNext()
			right.getNext()
			output_json.append(word1[0])
			#print word1["word"]

		else:
			nextMatch = getBestTimeMatch(left, right)
			leftMatch = left.getNext(nextMatch["leftDepth"])
			rightMatch = right.getNext(nextMatch["rightDepth"])

			winner = leftMatch
			loser = rightMatch

			if getConfidence(leftMatch) < getConfidence(rightMatch):
				winner = rightMatch
				loser = leftMatch

			reconciled = reconcile(winner, loser)

			for item in reconciled:
				speaker = getSpeakerForWord(item, leftMatch)
				item["speaker"] = speaker
				output_json.append(item)

	logger.info('Completed processing of ' + str(len(output_json)) + ' words.')

	return output_json


def combine(event, context):
	logger.debug('event: {}'.format(event))
	input_file_name = event['Records'][0]['s3']['object']['key']
	aws_bucket = os.environ["AWS_INPUT_BUCKET"]
	watson_bucket = os.environ["WATSON_INPUT_BUCKET"]

	aws_object = s3.Object(aws_bucket, input_file_name)
	watson_object = s3.Object(watson_bucket, input_file_name)
	both_present = True

	try:
		aws_object.load()
		watson_object.load()
	except botocore.exceptions.ClientError as e:
		both_present = False

	if both_present:
		output_json = processFiles(aws_object, watson_object)
		output_bucket = os.environ["OUTPUT_BUCKET"]

		logger.info('Starting writing JSON to  "' + input_file_name + '" in bucket "' + output_bucket + '".')
		output_file = s3.Object(output_bucket, input_file_name)
		output_file.put(Body=json.dumps(output_json))
		logger.info('Completed writing JSON to  "' + input_file_name + '" in bucket "' + output_bucket + '".')
	else:
		logger.info('Skipping combine for "' + input_file_name + '" because at least one normalization is missing.')

	return {'statusCode': httplib.OK}