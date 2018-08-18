from __future__ import absolute_import
import httplib
import urllib
import os
import io
import boto3
import json
import requests
import datetime
import uuid

from pynamodb.exceptions import DoesNotExist
from functions.utils.pynamodb_models import EpisodeModel
from functions.utils.log_cfg import logger
from functions.utils.constants import WORD, SPEAKER, CONFIDENCE, START_TIME, END_TIME

s3 = boto3.resource('s3')
sns = boto3.resource('sns')
secrets = boto3.client("secretsmanager")

TRANSCRIBE_BASE_URL = 'https://stream.watsonplatform.net/speech-to-text/api/v1/recognitions'
REGISTER_CALLBACK_URL = 'https://stream.watsonplatform.net/speech-to-text/api/v1/register_callback'
CHALLENGE_STRING = 'challenge_string'
QUERY_STRING = 'queryStringParameters'


def startTranscriptionJob(audioFile, name, credentials, callbackURL):
    queryParams = {
        "callback_url": callbackURL,
        "user_token": name,
        "timestamps": True,
        "word_confidence": True,
        "speaker_labels": True,
        "smart_formatting": True,
        "inactivity_timeout": -1
    }
    headers = {
        "Content-Type": "audio/mp3"
    }
    url = TRANSCRIBE_BASE_URL + '?' + urllib.urlencode(queryParams)
    return requests.post(url,
                         data=audioFile.read(),
                         headers=headers,
                         auth=(credentials['username'],
                               credentials['password']),
                         stream=True)


def registerCallbackURL(callbackURL, credentials):
    logger.info('Registering callback to URL: ' + callbackURL)
    queryParams = {
        "callback_url": callbackURL
    }
    url = REGISTER_CALLBACK_URL + '?' + urllib.urlencode(queryParams)
    logger.info('Sending request with URL: ' + url)
    return requests.post(url, auth=(credentials['username'], credentials['password']))


def transcribe(event, context):
    logger.debug(json.dumps(event))

    INPUT_BUCKET = os.environ['INPUT_BUCKET']
    WATSON_CALLBACK_URL = os.environ['WATSON_CALLBACK_URL']
    WATSON_TRANSCRIBE_CREDENTIALS = os.environ['WATSON_TRANSCRIBE_CREDENTIALS']

    # Load the watson transcription service credentials from the AWS Secrets Manager.
    secretResponse = secrets.get_secret_value(
        SecretId=WATSON_TRANSCRIBE_CREDENTIALS)
    credentials = json.loads(secretResponse['SecretString'])

    callbackResponse = registerCallbackURL(WATSON_CALLBACK_URL, credentials)

    if callbackResponse.status_code == 200 or callbackResponse.status_code == 201:
        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])
            for output in message['outputs']:
                key = output['key']
                episode = key.split('.')[0]

                logger.info('Starting Recognition job.')
                # Get the audio file from the S3 bucket as a streamable object.
                audioObject = s3.Object(INPUT_BUCKET, key)
                audioFile = audioObject.get()['Body']

                # POST the audio file to the Watson transcription start job endpoint with the correct query params.
                response = startTranscriptionJob(
                    audioFile, episode, credentials, WATSON_CALLBACK_URL)
                logger.info('Started Recognition job with response code: ' +
                            str(response.status_code) + ' and body ' + response.text)
    else:
        logger.info('Watson callback registration failed with response code: ' +
                    str(callbackResponse.status_code) + ' and body ' + callbackResponse.text)


def verify(event, context):
    logger.debug(json.dumps(event))

    response = {
        "statusCode": 400
    }

    if CHALLENGE_STRING in event[QUERY_STRING]:
        response = {
            "statusCode": 200,
            "headers": {
                "Content-Type": "text/plain"
            },
            "body": event[QUERY_STRING][CHALLENGE_STRING]
        }

    return response


def download(event, context):
    logger.debug(json.dumps(event))

    OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
    WATSON_TRANSCRIBE_CREDENTIALS = os.environ['WATSON_TRANSCRIBE_CREDENTIALS']
    COMPLETE_TOPIC = os.environ['COMPLETE_TOPIC']

    topic = sns.Topic(COMPLETE_TOPIC)

    status = json.loads(event['body'])

    if status['event'] == 'recognitions.completed':
        logger.info(
            'Fetching Watson transcription service credentials from AWS Secrets Manager.')
        # Load the watson transcription service credentials from the AWS Secrets Manager.
        secretResponse = secrets.get_secret_value(
            SecretId=WATSON_TRANSCRIBE_CREDENTIALS)
        credentials = json.loads(secretResponse['SecretString'])
        logger.info(
            'Retrieved Watson transcription service credentials from AWS Secrets Manager.')

        logger.info(
            'Fetching transcription results from Watson for job: ' + status['id'])
        url = TRANSCRIBE_BASE_URL + '/' + status['id']
        data = requests.get(url, auth=(
            credentials['username'], credentials['password']), stream=True)
        logger.info(
            'Retreived transcription results from Watson for job: ' + status['id'])

        episode = status['user_token'].split('/')[0]
        offset = status['user_token'].split('/')[1]
        filename = status['id'] + '-' + episode + '-' + offset + '.json'

        logger.info('Uploading transcription results to S3 ' +
                    OUTPUT_BUCKET + '/' + filename)
        bucket = s3.Bucket(OUTPUT_BUCKET)
        bucket.upload_fileobj(data.raw, filename)
        logger.info('Finished uploading transcription results to S3 ' +
                    OUTPUT_BUCKET + '/' + filename)

        message = {
            'filename': filename,
        }
        logger.debug('Sending ' + json.dumps(message) +
                     '\n to the Watson download complete SNS.')
        response = topic.publish(Message=json.dumps(
            {'default': json.dumps(message)}), MessageStructure='json')
        logger.debug(
            'Sent message to Watson download complete SNS ' + json.dumps(response))
    else:
        logger.info('Skipping processing of ' +
                    status['event'] + ' event from Watson.')


def normalize(event, context):
    logger.debug(json.dumps(event))

    INPUT_BUCKET = os.environ['INPUT_BUCKET']
    OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
    COMPLETE_TOPIC = os.environ['COMPLETE_TOPIC']
    topic = sns.Topic(COMPLETE_TOPIC)

    for record in event['Records']:
        message = json.loads(record['Sns']['Message'])

        input_file_name = message['filename']

        logger.info('Starting fetching input JSON file "' +
                    input_file_name + '" from bucket "' + INPUT_BUCKET + '".')
        input_object = s3.Object(INPUT_BUCKET, input_file_name)
        response = input_object.get()
        logger.info('Completed fetching input JSON file "' +
                    input_file_name + '" from bucket "' + INPUT_BUCKET + '".')

        logger.info('Starting reading JSON from file.')
        file_content = response['Body'].read().decode('utf-8')
        json_content = json.loads(file_content)
        logger.info('Completed reading JSON from file.')

        output_json = []
        items = json_content["results"][0]["results"]
        speaker_labels = json_content["results"][0]['speaker_labels']
        speaker_index = 0
        total_words = 0
        speakers = {}
        speaker_count = 0

        logger.info(
            'Starting processing of an unknown number of recognized items.')
        for item in items:
            word_confidences = item["alternatives"][0]["word_confidence"]
            timings = item["alternatives"][0]["timestamps"]
            index = 0

            for word in word_confidences:
                word_output = {
                    WORD: word[0],
                    CONFIDENCE: word[1],
                    START_TIME: timings[index][1],
                    END_TIME: timings[index][2]
                }
                index = index + 1

                speaker = speaker_labels[speaker_index]['speaker']
                word_output[SPEAKER] = speaker
                speaker_index = speaker_index + 1

                # Build a dictionary of the speaker labels so we can clean them up
                if speaker not in speakers:
                    speakers[speaker] = speaker_count
                    speaker_count = speaker_count + 1

                total_words = total_words + 1
                output_json.append(word_output)

        # Watson speaker labels can be all over the place. Clean them up.
        for item in output_json:
            item[SPEAKER] = speakers[item[SPEAKER]]

        logger.info('Completed processing of ' + str(total_words) + ' words.')

        logger.info('Starting writing JSON to  "' +
                    input_file_name + '" in bucket "' + OUTPUT_BUCKET + '".')
        output_file = s3.Object(OUTPUT_BUCKET, input_file_name)
        output_file.put(Body=json.dumps(output_json))
        logger.info('Completed writing JSON to  "' +
                    input_file_name + '" in bucket "' + OUTPUT_BUCKET + '".')

        guid = input_file_name.split('-')[5]
        logger.debug('Starting updating dynamodb record for ' + guid + '.')
        episode = EpisodeModel.get(hash_key=guid)
        if episode.splitWatsonTranscriptions:
            if input_file_name not in episode.splitWatsonTranscriptions:
                episode.splitWatsonTranscriptions.append(input_file_name)
        else:
            episode.splitWatsonTranscriptions = [input_file_name]
        episode.save()
        logger.debug('Completed updating dynamodb record for ' + guid + '.')

        if len(episode.splitWatsonTranscriptions) == len(episode.splits):
            message = {
                'files': [],
                'guid': guid
            }
            for key in episode.splitWatsonTranscriptions:
                message['files'].append(key)
            logger.debug('Sending ' + json.dumps(message) +
                         '\n to the Watson normalization complete SNS.')
            response = topic.publish(Message=json.dumps(
                {'default': json.dumps(message)}), MessageStructure='json')
            logger.debug(
                'Sent message to Watson normalization complete SNS ' + json.dumps(response))
