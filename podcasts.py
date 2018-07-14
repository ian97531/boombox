import boto3
import requests
import feedparser
from datetime import datetime
from time import mktime

from pynamodb.exceptions import DoesNotExist
from podcast_model import PodcastModel

s3 = boto3.resource('s3')
dynamodb = boto3.resource('dynamodb')

PODCAST_JOBS_TABLE = os.environ['PODCAST_JOBS_TABLE']
PODCASTS_TABLE = os.environ['PODCASTS_TABLE']

def checkRSSFeed(event, context):
	FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
	response = feedparser.parse(FEED_URL)
	podcast = None
	try:
		podcast = PodcastModel.get(hash_key=FEED_URL)
	except DoesNotExist:
		podcast = PodcastModel(feedURL=FEED_URL)

	podcast.title = channel['title']
	podcast.subtitle = channel['subtitle']
	podcast.author = channel['author']
	podcast.summary = channel['summary']
	podcast.category = channel['tags'][0]['term']
	podcast.language = channel['language']
	podcast.image = channel['image']['href']
	podcast.lastModifiedAt = datetime.fromtimestamp(mktime(channel['updated_parsed']))

	podcast.save()




def download(event, context):
	startTime = datetime.now()

	podcast_url = 'http://traffic.libsyn.com/hellointernet/104.mp3'
	bucket = s3.Bucket('boombox-podcast-input')
	data = requests.get(podcast_url, stream=True)
	bucket.upload_fileobj(data.raw, 'hi104.mp3')
 
	print datetime.now() - startTime 



