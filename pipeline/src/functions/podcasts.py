from __future__ import absolute_import
import boto3
import os
import json
import math
import requests
import feedparser
import time

from datetime import datetime
from slugify import slugify
from time import mktime

from pynamodb.exceptions import DoesNotExist
from src.utils.pynamodb_models import PodcastModel, EpisodeModel
from src.utils.log_cfg import logger
from src.utils.utils import buildFilename, getFileInfo, logError, logStatus
from src.utils.constants import STARTING

s3 = boto3.resource('s3')
sns = boto3.resource('sns')
transcoder = boto3.client('elastictranscoder')

INSERT_LIMIT = int(os.environ['INSERT_LIMIT'])
PODCASTS_TABLE = os.environ['PODCASTS_TABLE']
EPISODES_TABLE = os.environ['EPISODES_TABLE']

M4A_PRESET = '1351620000001-100120'  # M4A AAC 160 44k
OGG_PRESET = '1531717800275-2wz911'  # OGG Vorbis 160 44k
MP3_PRESET = '1351620000001-300030'  # MP3 160 44k


def getEnclosure(links):
    for link in links:
        if link['rel'] == 'enclosure':
            return link['href']


def checkRSSFeed(event, context):
    logger.debug(json.dumps(event))
    try:
        COMPLETE_TOPIC = os.environ['COMPLETE_TOPIC']
        topic = sns.Topic(COMPLETE_TOPIC)

        FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
        page = 1
        response = feedparser.parse(FEED_URL)
        channel = response['feed']
        podcast = None
        processedEpisodes = {}
        insertedEpisodes = 0
        podcastSlug = slugify(channel['title']).replace('_', '-')
        try:
            podcast = PodcastModel.get(hash_key=podcastSlug)
            processedEpisodes = json.loads(podcast.episodes)
        except DoesNotExist:
            podcast = PodcastModel(hash_key=podcastSlug)
            logger.info('Could not find a record for: "' + FEED_URL +
                        '". Creating a new record in the dynamodb table "' + PODCASTS_TABLE + '".')

        podcast.feedURL = FEED_URL
        podcast.title = channel['title']
        podcast.subtitle = channel['subtitle']
        podcast.author = channel['author']
        podcast.summary = channel['summary']
        podcast.category = channel['tags'][0]['term']
        podcast.language = channel['language']
        podcast.imageURL = channel['image']['href']
        podcast.lastModifiedAt = datetime.fromtimestamp(
            mktime(channel['updated_parsed']))

        publishedEpisodes = response['entries']
        while len(response['entries']) > 0:
            page = page + 1
            response = feedparser.parse(FEED_URL + '&page=' + str(page))
            publishedEpisodes = publishedEpisodes + response['entries']

        for episode in publishedEpisodes:
            episodeSlug = slugify(episode['title']).replace('_', '-')
            publishTimestamp = int(mktime(episode['published_parsed']))
            publishedAt = datetime.fromtimestamp(publishTimestamp)
            episodeURL = getEnclosure(episode['links'])
            if not episodeSlug in processedEpisodes and insertedEpisodes < INSERT_LIMIT:
                published = time.strftime(
                    '%Y-%m-%d %H:%M:%S', episode['published_parsed'])
                logStatus(
                    STARTING, channel['title'],
                    episode['title'],
                    episodeURL, published)

                logger.debug('Inserting "' + episodeURL +
                             '" into the dynamodb table "' + EPISODES_TABLE + '".')
                newEpisode = EpisodeModel(
                    podcastSlug=podcastSlug,
                    publishTimestamp=publishTimestamp,
                    publishedAt=publishedAt,
                    slug=episodeSlug,
                    guid=episode['id'],
                    title=episode['title'],
                    summary=episode['summary'],
                    episodeURL=episodeURL,
                    imageURL=episode['image']['href'],

                )
                newEpisode.save()
                processedEpisodes[episodeSlug] = publishTimestamp
                insertedEpisodes = insertedEpisodes + 1
                logger.debug('Completed inserting "' + episodeURL +
                             '" into the dynamodb table "' + EPISODES_TABLE + '".')

                message = {
                    'episodeURL': episodeURL,
                    'podcastSlug': podcastSlug,
                    'publishTimestamp': publishTimestamp,
                    'episodeSlug': episodeSlug
                }
                logger.debug('Sending ' + json.dumps(message) +
                             '\n to the download pending SNS.')
                response = topic.publish(Message=json.dumps(
                    {'default': json.dumps(message)}), MessageStructure='json')
                logger.debug(
                    'Sent message to the download pending SNS ' + json.dumps(response))
            elif not episodeSlug in processedEpisodes:
                logger.debug('Skipping "' + episodeURL + '" because the insertion max of ' +
                             str(INSERT_LIMIT) + ' has been reached.')
            else:
                logger.debug('Skipping "' + episodeURL +
                             '" because it\'s already in dynamodb table "' + EPISODES_TABLE + '".')

        logger.info(str(insertedEpisodes) +
                    ' new episodes were inserted into the dynamodb table "' + EPISODES_TABLE + '".')
        podcast.episodes = json.dumps(processedEpisodes)
        podcast.save()
    except Exception as e:
        logError(e, event)
        raise


def download(event, context):
    logger.debug(json.dumps(event))
    try:
        startTime = datetime.now()
        OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
        COMPLETE_TOPIC = os.environ['COMPLETE_TOPIC']

        topic = sns.Topic(COMPLETE_TOPIC)
        downloads = 0
        for record in event['Records']:
            data = json.loads(record['Sns']['Message'])
            podcastSlug = data['podcastSlug']
            episodeSlug = data['episodeSlug']
            publishTimestamp = data['publishTimestamp']
            episode_url = data['episodeURL']
            filename = buildFilename('mp3', podcastSlug, episodeSlug, publishTimestamp)

            logger.debug('Starting download of "' + episode_url +
                         '" to bucket "s3:/' + OUTPUT_BUCKET + '/' + filename + '".')
            bucket = s3.Bucket(OUTPUT_BUCKET)
            data = requests.get(episode_url, stream=True)
            bucket.upload_fileobj(data.raw, filename)
            logger.debug('Completed download of "' + episode_url +
                         '" to bucket "s3:/' + OUTPUT_BUCKET + '/' + filename + '".')

            downloads = downloads + 1

            message = {
                'podcastSlug': podcastSlug,
                'publishTimestamp': publishTimestamp,
                'episodeSlug': episodeSlug,
                'filename': filename
            }
            logger.debug('Sending ' + json.dumps(message) +
                         '\n to the transcode pending SNS.')
            response = topic.publish(Message=json.dumps(
                {'default': json.dumps(message)}), MessageStructure='json')
            logger.debug(
                'Sent message to the transcode pending SNS ' + json.dumps(response))

        logger.info('Completed downloads for ' + str(downloads) +
                    ' episodes in ' + str(datetime.now() - startTime) + ' .')
    except Exception as e:
        logError(e, event)
        raise


def transcode(event, context):
    logger.debug(json.dumps(event))
    try:
        TRANSCODE_PIPELINE_ID = os.environ['TRANSCODE_PIPELINE_ID']

        for record in event['Records']:
            data = json.loads(record['Sns']['Message'])
            podcastSlug = data['podcastSlug']
            episodeSlug = data['episodeSlug']
            publishTimestamp = data['publishTimestamp']
            mp3Filename = data['filename']

            m4a = {
                'Key': buildFilename('m4a', podcastSlug, episodeSlug, publishTimestamp),
                'PresetId': M4A_PRESET
            }
            ogg = {
                'Key': buildFilename('ogg', podcastSlug, episodeSlug, publishTimestamp),
                'PresetId': OGG_PRESET
            }
            response = transcoder.create_job(PipelineId=TRANSCODE_PIPELINE_ID,
                                             Input={'Key': mp3Filename},
                                             Outputs=[m4a, ogg])
            logger.debug(json.dumps(response))
    except Exception as e:
        logError(e, event)
        raise


def filePermissions(event, context):
    logger.debug(json.dumps(event))
    try:
        BUCKET_PREFIX = 'https://s3.amazonaws.com/'
        ORIGINAL_BUCKET = os.environ['ORIGINAL_BUCKET']
        TRANSCODED_BUCKET = os.environ['TRANSCODED_BUCKET']
        ORIGINAL_BUCKET_URL_PREFIX = BUCKET_PREFIX + ORIGINAL_BUCKET + '/'
        TRANSCODED_BUCKET_URL_PREFIX = BUCKET_PREFIX + TRANSCODED_BUCKET + '/'
        COMPLETE_TOPIC = os.environ['COMPLETE_TOPIC']

        topic = sns.Topic(COMPLETE_TOPIC)
        records = 0

        logger.info('Starting setting permissions for ' +
                    str(len(event['Records'])) + ' episodes.')

        for record in event['Records']:
            jobResult = json.loads(record['Sns']['Message'])
            duration = 0
            mp3Filename = jobResult['input']['key']
            m4aFilename = None
            oggFilename = None

            podcastSlug, episodeSlug, publishTimestamp, _ = getFileInfo(mp3Filename)

            for output in jobResult['outputs']:
                duration = output['duration']
                if output['presetId'] == M4A_PRESET:
                    m4aFilename = output['key']
                elif output['presetId'] == OGG_PRESET:
                    oggFilename = output['key']

            logger.debug(
                'Starting setting public read permissions for ' + podcastSlug + ' ' + episodeSlug +
                '.')
            mp3_acl = s3.ObjectAcl(ORIGINAL_BUCKET, mp3Filename)
            m4a_acl = s3.ObjectAcl(TRANSCODED_BUCKET, m4aFilename)
            ogg_acl = s3.ObjectAcl(TRANSCODED_BUCKET, oggFilename)
            mp3_acl.put(ACL='public-read')
            m4a_acl.put(ACL='public-read')
            ogg_acl.put(ACL='public-read')
            logger.debug(
                'Completed setting public read permissions for ' + podcastSlug + ' ' + episodeSlug +
                '.')

            logger.debug(
                'Starting updating dynamodb record for ' + podcastSlug + ' ' + episodeSlug + '.')
            episode = EpisodeModel.get(podcastSlug, publishTimestamp)
            episode.mp3URL = ORIGINAL_BUCKET_URL_PREFIX + mp3Filename
            episode.m4aURL = TRANSCODED_BUCKET_URL_PREFIX + m4aFilename
            episode.oggURL = TRANSCODED_BUCKET_URL_PREFIX + oggFilename
            episode.duration = duration
            episode.save()
            logger.debug(
                'Completed updating dynamodb record for ' + podcastSlug + ' ' + episodeSlug + '.')

            records = records + 1

            message = {
                'podcastSlug': podcastSlug,
                'episodeSlug': episodeSlug,
                'publishTimestamp': publishTimestamp,
                'filename': mp3Filename,
                'duration': duration
            }
            logger.debug('Sending ' + json.dumps(message) +
                         '\n to the permissions complete SNS.')
            response = topic.publish(Message=json.dumps(
                {'default': json.dumps(message)}), MessageStructure='json')
            logger.debug('Sent message to permissions complete SNS ' +
                         json.dumps(response))

        logger.info('Completed setting permissions for ' +
                    str(records) + ' episodes.')
    except Exception as e:
        logError(e, event)
        raise


def split(event, context):
    logger.debug(json.dumps(event))
    try:
        SPLIT_PIPELINE_ID = os.environ['SPLIT_PIPELINE_ID']
        MAX_LENGTH = float(3300)
        OVERLAP_LENGTH = 4 * 60

        for record in event['Records']:
            message = json.loads(record['Sns']['Message'])
            duration = message['duration']
            filename = message['filename']
            podcastSlug = message['podcastSlug']
            episodeSlug = message['episodeSlug']
            publishTimestamp = message['publishTimestamp']

            segments = math.ceil(duration/MAX_LENGTH)
            segmentDuration = int(math.ceil(duration/segments))
            startTime = 0
            splits = []

            for _ in range(int(segments - 1)):
                inputs = [{
                    'Key': filename,
                    'TimeSpan': {
                        'StartTime': str(startTime),
                        'Duration': str(segmentDuration)
                    }
                }]

                outputFilename = buildFilename(
                    'mp3', podcastSlug, episodeSlug, publishTimestamp, startTime)
                splits.append(outputFilename)
                outputs = [{
                    'Key': outputFilename,
                    'PresetId': MP3_PRESET
                }]

                logger.debug('Starting split job with inputs\n ' +
                             json.dumps(inputs))
                logger.debug('Starting split job with outputs\n ' +
                             json.dumps(outputs))
                transcoder.create_job(PipelineId=SPLIT_PIPELINE_ID,
                                      Inputs=inputs,
                                      Outputs=outputs)

                overlapStartTime = (
                    startTime + segmentDuration) - (OVERLAP_LENGTH/2)
                inputs = [{
                    'Key': filename,
                    'TimeSpan': {
                        'StartTime': str(overlapStartTime),
                        'Duration': str(OVERLAP_LENGTH)
                    }
                }]

                outputFilename = buildFilename(
                    'mp3', podcastSlug, episodeSlug, publishTimestamp, overlapStartTime)
                splits.append(outputFilename)
                outputs = [{
                    'Key': outputFilename,
                    'PresetId': MP3_PRESET
                }]

                logger.debug('Starting split job with inputs\n ' +
                             json.dumps(inputs))
                logger.debug('Starting split job with outputs\n ' +
                             json.dumps(outputs))
                transcoder.create_job(PipelineId=SPLIT_PIPELINE_ID,
                                      Inputs=inputs,
                                      Outputs=outputs)

                startTime = startTime + segmentDuration

            finalDuration = int(duration - startTime)
            inputs = [{
                'Key': filename,
                'TimeSpan': {
                    'StartTime': str(startTime),
                    'Duration': str(finalDuration)
                }
            }]

            outputFilename = buildFilename(
                'mp3', podcastSlug, episodeSlug, publishTimestamp, startTime)
            splits.append(outputFilename)
            outputs = [{
                'Key': outputFilename,
                'PresetId': MP3_PRESET,
            }]

            logger.debug('Starting split job with inputs\n ' +
                         json.dumps(inputs))
            logger.debug('Starting split job with outputs\n ' +
                         json.dumps(outputs))
            transcoder.create_job(PipelineId=SPLIT_PIPELINE_ID,
                                  Inputs=inputs,
                                  Outputs=outputs)

            logger.debug(
                'Starting updating dynamodb record for ' + podcastSlug + ' ' + episodeSlug + '.')
            episode = EpisodeModel.get(podcastSlug, publishTimestamp)
            episode.splits = splits
            episode.save()
            logger.debug(
                'Completed updating dynamodb record for ' + podcastSlug + ' ' + episodeSlug + '.')
    except Exception as e:
        logError(e, event)
        raise
