import boto3
import os
import json
import math
import requests
import feedparser
from log_cfg import logger
from datetime import datetime
from time import mktime

from pynamodb.exceptions import DoesNotExist
from podcast_models import PodcastModel, EpisodeModel

s3 = boto3.resource('s3')
sns = boto3.resource('sns')
transcoder = boto3.client('elastictranscoder')

INSERT_LIMIT = int(os.environ['INSERT_LIMIT'])
PODCASTS_TABLE = os.environ['PODCASTS_TABLE']
EPISODES_TABLE = os.environ['EPISODES_TABLE']

M4A_PRESET = '1351620000001-100120' #M4A AAC 160 44k
OGG_PRESET = '1531717800275-2wz911' #OGG Vorbis 160 44k
MP3_PRESET = '1351620000001-300030' #MP3 160 44k


def getEnclosure(links):
	for link in links:
		if link['rel'] == 'enclosure':
			return link['href']


def getSafeGUID(guid):
	keepCharacters = (' ', '.', '_', '-')
	return "".join(c for c in guid if c.isalnum() or c in keepCharacters).rstrip()


def checkRSSFeed(event, context):
	logger.debug(json.dumps(event))
	FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
	page = 1
	response = feedparser.parse(FEED_URL)
	podcast = None
	processedEpisodes = []
	insertedEpisodes = 0
	try:
		podcast = PodcastModel.get(hash_key=FEED_URL)
		processedEpisodes = podcast.episodes
	except DoesNotExist:
		podcast = PodcastModel(feedURL=FEED_URL)
		logger.info('Could not find a record for: "' + FEED_URL + '". Creating a new record in the dynamodb table "' + PODCASTS_TABLE + '".')

	channel = response['feed']
	podcast.title = channel['title']
	podcast.subtitle = channel['subtitle']
	podcast.author = channel['author']
	podcast.summary = channel['summary']
	podcast.category = channel['tags'][0]['term']
	podcast.language = channel['language']
	podcast.imageURL = channel['image']['href']
	podcast.lastModifiedAt = datetime.fromtimestamp(mktime(channel['updated_parsed']))

	publishedEpisodes = response['entries']
	while len(response['entries']) > 0:
		page = page + 1
		response = feedparser.parse(FEED_URL + '&page=' + str(page))
		publishedEpisodes = publishedEpisodes + response['entries']

	for episode in publishedEpisodes:
		guid = getSafeGUID(episode['id'])
		episodeURL = getEnclosure(episode['links'])
		if not guid in processedEpisodes and insertedEpisodes < INSERT_LIMIT:
			logger.debug('Inserting "' + episodeURL + '" into the dynamodb table "' + EPISODES_TABLE + '".')
			newEpisode = EpisodeModel(
				guid=guid,
				title=episode['title'],
				summary=episode['summary'],
				episodeURL=episodeURL,
				imageURL=episode['image']['href'],
				feedURL=FEED_URL,
				publishedAt=datetime.fromtimestamp(mktime(episode['published_parsed']))
			)
			newEpisode.save()
			processedEpisodes.append(guid)
			insertedEpisodes = insertedEpisodes + 1
			logger.debug('Completed inserting "' + episodeURL + '" into the dynamodb table "' + EPISODES_TABLE + '".')
		elif not guid in processedEpisodes:
			logger.debug('Skipping "' + episodeURL + '" because the insertion max of ' + str(INSERT_LIMIT) + ' has been reached.')
		else:
			logger.debug('Skipping "' + episodeURL + '" because it\'s already in dynamodb table "' + EPISODES_TABLE + '".')
			

	logger.info(str(insertedEpisodes) + ' new episodes were inserted into the dynamodb table "' + EPISODES_TABLE + '".')
	podcast.episodes = processedEpisodes
	podcast.save()


def download(event, context):
	logger.debug(json.dumps(event))
	startTime = datetime.now()
	OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']
	TRANSCODE_PENDING_ARN = os.environ['TRANSCODE_PENDING_ARN']

	topic = sns.Topic(TRANSCODE_PENDING_ARN)
	downloads = 0
	for record in event['Records']:
		if record['eventName'] == 'INSERT':
			podcast_url = record['dynamodb']['NewImage']['episodeURL']['S']
			guid = record['dynamodb']['NewImage']['guid']['S']
			filename = guid + '.mp3'

			logger.debug('Starting download of "' + podcast_url + '" to bucket "s3:/' + OUTPUT_BUCKET + '/' + filename + '".')
			bucket = s3.Bucket(OUTPUT_BUCKET)
			data = requests.get(podcast_url, stream=True)
			bucket.upload_fileobj(data.raw, filename)
			logger.debug('Completed download of "' + podcast_url + '" to bucket "s3:/' + OUTPUT_BUCKET + '/' + filename + '".')
			
			downloads = downloads + 1
			
			message = {
				'guid': guid,
				'filename': filename
			}
			logger.debug('Sending ' + json.dumps(message) + '\n to the transcode pending SNS.')
			response = topic.publish(Message=json.dumps({'default': json.dumps(message)}), MessageStructure='json')
			logger.debug('Sent message to the transcode pending SNS ' + json.dumps(response))

 	logger.info('Completed downloads for ' + str(downloads) + ' episodes in ' + str(datetime.now() - startTime) + ' .')


def transcode(event, context):
	logger.debug(json.dumps(event))
	TRANSCODE_PIPELINE_ID = os.environ['TRANSCODE_PIPELINE_ID']

	for record in event['Records']:
		data = json.loads(record['Sns']['Message'])
		filename = data['filename']
		guid = data['guid']
		m4a = {
			'Key': guid + '.m4a',
			'PresetId': M4A_PRESET
		}
		ogg = {
			'Key': guid + '.ogg',
			'PresetId': OGG_PRESET 
		}
		response = transcoder.create_job(PipelineId=TRANSCODE_PIPELINE_ID,
										Input={'Key': data['filename']},
										Outputs=[m4a, ogg])
		logger.debug(json.dumps(response))


def filePermissions(event, context):
	logger.debug(json.dumps(event))

	INPUT_BUCKET = os.environ['INPUT_BUCKET']
	PERMISSIONS_COMPLETE_ARN = os.environ['PERMISSIONS_COMPLETE_ARN']
	BUCKET_PREFIX = 'https://s3.amazonaws.com/'
	BUCKET_URL_PREFIX = BUCKET_PREFIX + INPUT_BUCKET + '/'

	topic = sns.Topic(PERMISSIONS_COMPLETE_ARN)
	records = 0

	logger.info('Starting setting permissions for ' + str(len(event['Records'])) + ' episodes.')

	for record in event['Records']:
		jobResult = json.loads(record['Sns']['Message'])
		duration = 0
		mp3Filename = jobResult['input']['key']
		m4aFilename = None
		oggFilename = None
		guid = mp3Filename.split('.')[0]

		for output in jobResult['outputs']:
			duration = output['duration']
			if output['presetId'] == M4A_PRESET:
				m4aFilename = output['key']
				object_acl = s3.ObjectAcl('bucket_name','object_key')
			elif output['presetId'] == OGG_PRESET:
				oggFilename = output['key']

		logger.debug('Starting setting public read permissions for ' + guid + '.')
		mp3_acl = s3.ObjectAcl(INPUT_BUCKET, mp3Filename)
		m4a_acl = s3.ObjectAcl(INPUT_BUCKET, m4aFilename)
		ogg_acl = s3.ObjectAcl(INPUT_BUCKET, oggFilename)
		mp3_acl.put(ACL='public-read')
		m4a_acl.put(ACL='public-read')
		ogg_acl.put(ACL='public-read')
		logger.debug('Completed setting public read permissions for ' + guid + '.')

		logger.debug('Starting updating dynamodb record for ' + guid + '.')
		episode = EpisodeModel.get(hash_key=guid)
		episode.mp3URL = BUCKET_URL_PREFIX + mp3Filename
		episode.m4aURL = BUCKET_URL_PREFIX + m4aFilename
		episode.oggURL = BUCKET_URL_PREFIX + oggFilename
		episode.duration = duration
		episode.save()
		logger.debug('Completed updating dynamodb record for ' + guid + '.')

		records = records + 1

		message = {
			'guid': guid,
			'filename': mp3Filename,
			'duration': duration
		}
		logger.debug('Sending ' + json.dumps(message) + '\n to the permissions complete SNS.')
		response = topic.publish(Message=json.dumps({'default': json.dumps(message)}), MessageStructure='json')
		logger.debug('Sent message to permissions complete SNS ' + json.dumps(response))

	logger.info('Completed setting permissions for ' + str(records) + ' episodes.')


def split(event, context):
	logger.debug(json.dumps(event))

	SPLIT_PIPELINE_ID = os.environ['SPLIT_PIPELINE_ID']
	MAX_LENGTH = float(3300)
	OVERLAP_LENGTH = 4 * 60

	for record in event['Records']:
		message = json.loads(record['Sns']['Message'])
		duration = message['duration']
		filename = message['filename']
		guid = message['guid']

		segments = math.ceil(duration/MAX_LENGTH)
		segmentDuration = int(math.ceil(duration/segments))
		startTime = 0
		splits = []

		for index in range(int(segments - 1)):
			inputs = [{
				'Key': filename,
				'TimeSpan': {
					'StartTime': str(startTime),
					'Duration': str(segmentDuration)
				}
			}]

			outputFilename = guid + '/' + str(startTime) + '.mp3'
			splits.append(outputFilename)
			outputs = [{
				'Key': outputFilename,
				'PresetId': MP3_PRESET
			}]

			logger.debug('Starting split job with inputs\n ' + json.dumps(inputs))
			logger.debug('Starting split job with outputs\n ' + json.dumps(outputs))
			transcoder.create_job(PipelineId=SPLIT_PIPELINE_ID,
								Inputs=inputs,
								Outputs=outputs)

			overlapStartTime = (startTime + segmentDuration) - (OVERLAP_LENGTH/2)
			inputs = [{
				'Key': filename,
				'TimeSpan': {
					'StartTime': str(overlapStartTime),
					'Duration': str(OVERLAP_LENGTH)
				}
			}]

			outputFilename = guid + '/' + str(overlapStartTime) + '.mp3'
			splits.append(outputFilename)
			outputs = [{
				'Key': outputFilename,
				'PresetId': MP3_PRESET
			}]

			logger.debug('Starting split job with inputs\n ' + json.dumps(inputs))
			logger.debug('Starting split job with outputs\n ' + json.dumps(outputs))
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

		outputFilename = guid + '/' + str(startTime) + '.mp3'
		splits.append(outputFilename)
		outputs = [{
			'Key': outputFilename,
			'PresetId': MP3_PRESET,
		}]

		logger.debug('Starting split job with inputs\n ' + json.dumps(inputs))
		logger.debug('Starting split job with outputs\n ' + json.dumps(outputs))
		transcoder.create_job(PipelineId=SPLIT_PIPELINE_ID,
							Inputs=inputs,
							Outputs=outputs)

		logger.debug('Starting updating dynamodb record for ' + guid + '.')
		episode = EpisodeModel.get(hash_key=guid)
		episode.splits = splits
		episode.save()
		logger.debug('Completed updating dynamodb record for ' + guid + '.')

		
def splitTranscribe(event, context):
	logger.debug(json.dumps(event))
