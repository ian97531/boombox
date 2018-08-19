import boto3
import json
import os
import traceback
import sys
from functions.utils.constants import EXCLUDE_ENV

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
        'traceback': stack,
        'error': str(exc),
        'invoking_event': event
    }, indent=4, sort_keys=True)

    subject = 'Pipeline ' + exceptionType.__name__ + ' in ' + \
        str(filename) + ':' + functionName + \
        ' on line ' + str(exceptionTraceback.tb_lineno)

    topic.publish(Message=message, Subject=subject)
