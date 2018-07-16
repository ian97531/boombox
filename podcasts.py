import boto3
import os
import json
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

def getEnclosure(links):
	for link in links:
		if link['rel'] == 'enclosure':
			return link['href']

def getSafeGUID(guid):
	keepCharacters = (' ', '.', '_', '-')
	return "".join(c for c in guid if c.isalnum() or c in keepCharacters).rstrip()

def checkRSSFeed(event, context):
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
			topic.publish(Message=json.dumps({'default': json.dumps(message)}), MessageStructure='json')

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
			'PresetId': '1351620000001-100120' #MP4 AAC 160k
		}
		ogg = {
			'Key': guid + '.ogg',
			'PresetId': '1531717800275-2wz911' #MP4 AAC 160k
		}
		response = transcoder.create_job(PipelineId=TRANSCODE_PIPELINE_ID,
										Input={'Key': data['filename']},
										Outputs=[m4a, ogg])
		logger.debug(json.dumps(response))


def split(event, context):
	logger.debug(json.dumps(event))
	OUTPUT_BUCKET = os.environ['OUTPUT_BUCKET']

