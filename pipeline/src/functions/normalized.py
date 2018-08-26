from __future__ import absolute_import
import httplib
import os
import boto3
import botocore
import json
import datetime
import time

from pynamodb.exceptions import DoesNotExist
from src.utils.pynamodb_models import PodcastModel, EpisodeModel, StatementModel
from src.utils.Transcription import Transcription
from src.utils.log_cfg import logger
from src.utils.utils import logError, logStatus
from src.utils.constants import COMPLETE, WORDS, SPEAKER, START_TIME, END_TIME, WORD

s3 = boto3.resource('s3')
sns = boto3.resource('sns')


def combine(event, context):
    logger.debug(json.dumps(event))
    try:
        aws_bucket = os.environ["AWS_INPUT_BUCKET"]
        watson_bucket = os.environ["WATSON_INPUT_BUCKET"]
        output_bucket = os.environ["OUTPUT_BUCKET"]
        complete_topic = os.environ['COMPLETE_TOPIC']
        topic = sns.Topic(complete_topic)

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

                logger.debug('Sending ' + json.dumps(message) +
                             '\n to the combine complete SNS.')
                message = {'guid': guid}
                response = topic.publish(Message=json.dumps(
                    {'default': json.dumps(message)}), MessageStructure='json')
                logger.debug(
                    'Sent message to the combine complete SNS ' + json.dumps(response))
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


def insert(event, context):
    logger.debug(json.dumps(event))
    try:
        input_bucket = os.environ["INPUT_BUCKET"]

        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])
            guid = message['guid']

            logger.info(
                'Starting reading the transcription file from S3 for episode "' + guid + '".')
            inputFilename = guid + '.json'
            input_object = s3.Object(input_bucket, inputFilename)
            response = input_object.get()
            file_content = response['Body'].read().decode('utf-8')
            json_content = json.loads(file_content)
            transcription = Transcription(json_content)
            logger.info(
                'Completed reading the transcription file from S3 for episode "' + guid + '".')

            logger.info(
                'Starting inserting statements for episode "' + guid + '".')
            statement = transcription.getNextStatement()
            statements = []
            while statement:
                statementWords = []
                for word in statement[WORDS]:
                    statementWords.append({
                        START_TIME: word[START_TIME],
                        END_TIME: word[END_TIME],
                        WORD: word[WORD]
                    })
                statements.append(StatementModel(
                    guid=guid,
                    endTime=statement[END_TIME],
                    startTime=statement[START_TIME],
                    speaker=statement[SPEAKER],
                    words=statementWords
                ))
                statement = transcription.getNextStatement()

            startTime = time.time()
            capacityUnitsUsed = 0
            for item in statements:
                response = item.save()

                # Make sure we don't get too far ahead of the provisioned capacity units.
                consumed = response['ConsumedCapacity']['CapacityUnits']
                capacityUnitsUsed = capacityUnitsUsed + consumed
                elapsedTime = time.time() - startTime
                if capacityUnitsUsed / elapsedTime > 10:
                    time.sleep(1)

            logger.info(
                'Completed inserting statements for episode "' + guid + '".')

            episode = EpisodeModel.get(hash_key=guid)
            podcast = PodcastModel.get(hash_key=episode.feedURL)
            published = episode.publishedAt.strftime("%Y-%m-%d %H:%M:%S")

            logStatus(COMPLETE, podcast.title, episode.title, guid,
                      episode.episodeURL, published)

    except Exception as e:
        logError(e, event)
        raise
