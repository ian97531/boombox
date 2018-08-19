from __future__ import absolute_import
import httplib
import os
import boto3
import botocore
import json

from pynamodb.exceptions import DoesNotExist
from functions.utils.pynamodb_models import EpisodeModel
from functions.utils.Transcription import Transcription
from functions.utils.log_cfg import logger
from functions.utils.utils import logError

s3 = boto3.resource('s3')
sns = boto3.resource('sns')


def combine(event, context):
    logger.debug(json.dumps(event))
    try:
        aws_bucket = os.environ["AWS_INPUT_BUCKET"]
        watson_bucket = os.environ["WATSON_INPUT_BUCKET"]
        output_bucket = os.environ["OUTPUT_BUCKET"]

        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])
            guid = message['guid']

            episode = EpisodeModel.get(hash_key=guid)

            watson_filename = episode.watsonTranscription
            aws_filename = episode.awsTranscription

            logger.info('Looking for ' + aws_filename + ' in ' + aws_bucket)
            logger.info('Looking for ' + watson_filename +
                        ' in ' + watson_bucket)
            aws_object = s3.Object(aws_bucket, aws_filename)
            watson_object = s3.Object(watson_bucket, watson_filename)
            both_present = True

            try:
                aws_object.load()
                watson_object.load()
            except botocore.exceptions.ClientError:
                both_present = False

            if both_present:
                logger.info('Starting fetching the normalized JSON files.')
                aws_response = aws_object.get()
                logger.info('Completed fetching the normalized AWS JSON file.')
                watson_response = watson_object.get()
                logger.info(
                    'Completed fetching the normalized Watson JSON file.')

                logger.info('Starting reading JSON from files.')
                aws_file_content = aws_response['Body'].read().decode('utf-8')
                aws_json_content = json.loads(aws_file_content)
                logger.info('Completed reading JSON from the AWS file.')
                watson_file_content = watson_response['Body'].read().decode(
                    'utf-8')
                watson_json_content = json.loads(watson_file_content)
                logger.info('Completed reading JSON from the Watson file.')

                left = Transcription(watson_json_content)
                right = Transcription(aws_json_content)
                left.enhanceTranscription(right)

                output_filename = guid + '.json'
                logger.info('Starting writing JSON to  "' +
                            output_filename + '" in bucket "' + output_bucket + '".')
                output_file = s3.Object(output_bucket, output_filename)
                output_file.put(Body=json.dumps(left.json))
                logger.info('Completed writing JSON to  "' +
                            output_filename + '" in bucket "' + output_bucket + '".')
            else:
                logger.info('Skipping combine for "' + guid +
                            '" because at least one normalization is missing.')
    except Exception as e:
        logError(e, event)
        raise


def zip(event, context):
    logger.debug(json.dumps(event))
    try:
        input_bucket = os.environ["INPUT_BUCKET"]
        output_bucket = os.environ["OUTPUT_BUCKET"]
        transcription_attribute = os.environ["TRANSCRIPTION_ATTRIBUTE"]
        complete_topic = os.environ['COMPLETE_TOPIC']
        topic = sns.Topic(complete_topic)

        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])

            guid = message['guid']
            outputFilename = guid + '.json'
            transcriptions = []

            logger.info('Starting reading "' + str(len(
                message['files'])) + '" transcription files from S3 for episode "' + guid + '".')
            for file in message['files']:
                fileName = file.split('.')[0]
                startTime = int(fileName.split('-')[6])

                input_object = s3.Object(input_bucket, file)
                response = input_object.get()
                file_content = response['Body'].read().decode('utf-8')
                json_content = json.loads(file_content)

                transcriptions.append(Transcription(json_content, startTime))
            logger.info('Completed reading "' + str(len(
                message['files'])) + '" transcription files from S3 for episode "' + guid + '".')

            logger.info('Starting zipping "' + str(len(transcriptions)) +
                        '" transcription files for episode "' + guid + '".')
            transcriptions.sort(key=Transcription.startTimeKey)
            first = transcriptions.pop(0)
            for transcription in transcriptions:
                first.appendTranscription(transcription)
            logger.info('Completed zipping "' + str(len(transcriptions) + 1) +
                        '" transcription files for episode "' + guid + '".')

            logger.info('Starting writing JSON to  "' +
                        outputFilename + '" in bucket "' + output_bucket + '".')
            outputFilename = guid + '.json'
            output_file = s3.Object(output_bucket, outputFilename)
            output_file.put(Body=json.dumps(first.json))
            logger.info('Completed writing JSON to  "' +
                        outputFilename + '" in bucket "' + output_bucket + '".')

            logger.debug('Starting updating dynamodb record for ' + guid + '.')
            episode = EpisodeModel.get(hash_key=guid)
            setattr(episode, transcription_attribute, outputFilename)
            episode.save()
            logger.debug(
                'Completed updating dynamodb record for ' + guid + '.')

            if episode.watsonTranscription and episode.awsTranscription:
                message = {
                    'guid': guid
                }
                logger.debug('Sending ' + json.dumps(message) +
                             '\n to the zip complete SNS.')
                response = topic.publish(Message=json.dumps(
                    {'default': json.dumps(message)}), MessageStructure='json')
                logger.debug(
                    'Sent message to the zip complete SNS ' + json.dumps(response))
    except Exception as e:
        logError(e, event)
        raise
