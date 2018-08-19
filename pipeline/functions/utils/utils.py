import boto3
import json
import os
import traceback
import sys

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
    exclude = ["AWS_ACCESS_KEY_ID",
               "AWS_SECRET_ACCESS_KEY",
               "AWS_SECURITY_TOKEN",
               "AWS_SESSION_TOKEN",
               "AWS_XRAY_CONTEXT_MISSING",
               "AWS_XRAY_DAEMON_ADDRESS",
               "LAMBDA_RUNTIME_DIR",
               "LAMBDA_TASK_ROOT",
               "LD_LIBRARY_PATH",
               "_AWS_XRAY_DAEMON_ADDRESS",
               "_AWS_XRAY_DAEMON_PORT",
               "_X_AMZN_TRACE_ID"]

    for key in os.environ:
        if key not in exclude:
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
