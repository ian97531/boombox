#!/usr/bin/python
import datetime
import json
import os
import pytz
import sys


sys.path.append('../src')

from utils.Transcription import Transcription


# Output: Array of words with content, speakers, start time, stop time, confidence.


file1 = sys.argv[1]
file2 = sys.argv[2]

left = None
right = None

with open(file1) as transcriptionData:
    left = Transcription(json.load(transcriptionData))

with open(file2) as transcriptionData:
    right = Transcription(json.load(transcriptionData))


left.enhanceTranscription(right)

now = datetime.datetime.now(pytz.UTC)

filename = os.getcwd() + '/combined-' + \
    now.strftime('%A, %B, %d, %Y %H%M%S') + '.json'

with open(filename, 'w') as outfile:
    json.dump(left.json, outfile)
