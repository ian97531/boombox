import boto3
import datetime
import json
import os
import traceback
import sys
from constants import EXCLUDE_ENV

sns = boto3.resource('sns')


def logError(exc, event=None):
    ERROR_TOPIC = os.environ['ERROR_TOPIC']
    topic = sns.Topic(ERROR_TOPIC)

    exceptionType, _, exceptionTraceback = sys.exc_info()
    stack = traceback.extract_tb(exceptionTraceback)
    filename = os.path.split(
        exceptionTraceback.tb_frame.f_code.co_filename)[1]
    functionName = stack[0][2]

    environmentVariables = {}

    for key in os.environ:
        if key not in EXCLUDE_ENV:
            environmentVariables[key] = os.environ[key]

    message = json.dumps({
        'environment': environmentVariables,
        'error': {
            'error_type': exceptionType.__name__,
            'error_message': str(exc),
            'traceback': stack
        },
        'invoking_event': event
    }, indent=4, sort_keys=True)

    subject = 'Pipeline ' + exceptionType.__name__ + ' in ' + \
        str(filename) + ':' + functionName + \
        ' on line ' + str(exceptionTraceback.tb_lineno)

    topic.publish(Message=message, Subject=subject)


def logStatus(status, podcast, episode, url, publishedAt):
    STATUS_TOPIC = os.environ['STATUS_TOPIC']
    topic = sns.Topic(STATUS_TOPIC)

    environmentVariables = {}

    for key in os.environ:
        if key not in EXCLUDE_ENV:
            environmentVariables[key] = os.environ[key]

    message = json.dumps({
        'environment': environmentVariables,
        'job': {
            'status': status,
            'podcast': podcast,
            'episode': episode,
            'url': url,
            'published_at': publishedAt
        }
    }, indent=4, sort_keys=True)

    subject = 'Pipeline ' + status + ' for ' + \
        podcast + ': ' + episode

    topic.publish(Message=message, Subject=subject)


def buildFilename(suffix, podcastSlug, episodeSlug, publishTimestamp, startTime=None,
                  currentTime=False):
    filename = podcastSlug + '/' + str(publishTimestamp) + '_' + episodeSlug

    if startTime != None:
        filename += '/' + str(startTime)

        if currentTime:
            filename += '_' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')

    if suffix:
        filename = filename + '.' + suffix

    return filename


def getFileInfo(filename):
    removeSuffix = filename.split('.')
    splitSlashes = removeSuffix[0].split('/')

    podcastSlug = splitSlashes[0]
    publishTimestamp = int(splitSlashes[1].split('_')[0])
    episodeSlug = splitSlashes[1].split('_')[1]
    startTime = None

    if len(splitSlashes) == 3:
        startTime = int(splitSlashes[2].split('_')[0])

    return (podcastSlug, episodeSlug, publishTimestamp, startTime)


def buildEpisodeKey(podcastSlug, publishTimestamp):
    return podcastSlug + '_' + str(publishTimestamp)


def getEpisodeKeyInfo(episodeKey):
    podcastSlug = episodeKey.split('_')[0]
    publishTimestamp = int(episodeKey.split('_')[1])
    return (podcastSlug, publishTimestamp)
