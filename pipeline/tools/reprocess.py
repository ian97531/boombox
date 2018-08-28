#!/usr/bin/python
"""Takes a stage and episode id and will delete and reprocess
transcription results associate with that episode.
"""
import json
import os
import sys

import boto3


S3 = boto3.resource('s3')
SNS = boto3.resource('sns', region_name='us-east-1')
DYNAMODB = boto3.client('dynamodb', region_name='us-east-1')


def remove_processed_files(stage, service, episode_id):
    """Removes all of the files and DB attributes for the specified episode.
    """
    to_reprocess = []
    table_name = 'boombox-' + stage.lower() + '-episodes'
    response = DYNAMODB.get_item(TableName=table_name, Key={'guid': {'S': episode_id}},)
    episode = response['Item']
    print 'Retrieved Episode ' + episode_id + ' from ' + table_name

    normalized_bucket = 'boombox-pipeline-' + stage + '-' + service.lower() + \
        '-normalized-transcriptions'
    zipped_bucket = 'boombox-pipeline-' + stage + '-' + service.lower() + \
        '-zipped-transcriptions'
    episode_attribute = 'split' + service + 'Transcriptions'

    for item in episode[episode_attribute]['L']:
        filename = item['S']
        to_reprocess.append(filename)
        S3.Object(normalized_bucket, filename).delete()
        print 'Deleted ' + filename + ' from ' + normalized_bucket

    S3.Object(zipped_bucket, episode_id + '.json').delete()
    print 'Deleted ' + episode_id + '.json from ' + zipped_bucket

    return to_reprocess


def start_reprocess(stage, service, items):
    """Kicks off re-processing jobs for the specified files and service.
    """
    topic_arn = 'arn:aws:sns:us-east-1:095713129403:boombox-pipeline-' + \
        stage + '-' + service.lower() + '-reprocess-transcription'
    topic = SNS.Topic(topic_arn)

    for filename in items:
        message = {'filename': filename}
        topic.publish(Message=json.dumps(
            {'default': json.dumps(message)}), MessageStructure='json')
        print 'Started reprocess job for ' + filename


def delete_from_db(stage, service, episode_id):
    """Deletes the records of the transcription processing jobs from the db."""
    table_name = 'boombox-' + stage.lower() + '-episodes'
    episode_attribute = 'split' + service + 'Transcriptions'
    DYNAMODB.update_item(TableName=table_name,
                         Key={'guid': {'S': episode_id}},
                         UpdateExpression='set ' + episode_attribute + ' = :a',
                         ExpressionAttributeValues={
                             ':a': {'L': []}
                         })
    print 'Deleted ' + episode_attribute + ' from episode ' + episode_id + ' in ' + table_name


def reprocess_all(stage, episode_id):
    """Deletes and then reprocesses all of the transcriptions for the
    specified episode.
    """
    services = ['AWS', 'Watson']
    for service in services:
        files = remove_processed_files(stage, service, episode_id)
        start_reprocess(stage, service, files)
        #delete_from_db(stage, service, episode_id)

    combined_bucket = 'boombox-pipeline-' + stage + '-combined-transcriptions'
    S3.Object(combined_bucket, episode_id + '.json').delete()


if __name__ == '__main__':
    STAGE = sys.argv[1]
    EPISODE_ID = sys.argv[2]
    reprocess_all(STAGE, EPISODE_ID)
