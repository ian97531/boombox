#!/usr/bin/python
import datetime
import json
import os
import sys
import pytz


sys.path.append('./pipeline/src')
# pylint: disable=E0401, C0413
from utils.Transcription import Transcription


# Output: Array of words with content, speakers, start time, stop time, confidence.
FILE_1 = sys.argv[1]
FILE_2 = sys.argv[2]

LEFT = None
RIGHT = None

with open(FILE_1) as transcriptionData:
    LEFT = Transcription(json.load(transcriptionData))

with open(FILE_2) as transcriptionData:
    RIGHT = Transcription(json.load(transcriptionData))


LEFT.enhanceTranscription(RIGHT)
LEFT.updateSpeakers(RIGHT)

NOW = datetime.datetime.now(pytz.UTC)

FILENAME = os.getcwd() + '/combined-' + \
    NOW.strftime('%A, %B, %d, %Y %H%M%S') + '.json'

with open(FILENAME, 'w') as outfile:
    json.dump(LEFT.json, outfile)
