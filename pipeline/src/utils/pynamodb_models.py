import os
from datetime import datetime

from pynamodb.attributes import ListAttribute, NumberAttribute, UnicodeAttribute, UTCDateTimeAttribute
from pynamodb.models import Model


class PodcastModel(Model):
    class Meta:
        table_name = os.environ['PODCASTS_TABLE']

    slug = UnicodeAttribute(hash_key=True, null=False)
    feedURL = UnicodeAttribute(null=False)
    title = UnicodeAttribute(null=False)
    subtitle = UnicodeAttribute(null=False)
    author = UnicodeAttribute(null=False)
    summary = UnicodeAttribute(null=False)
    category = UnicodeAttribute(null=False)
    language = UnicodeAttribute(null=False)
    imageURL = UnicodeAttribute(null=False)
    episodes = UnicodeAttribute(null=False)
    createdAt = UTCDateTimeAttribute(null=False, default=datetime.now())
    lastModifiedAt = UTCDateTimeAttribute(null=False)
    lastCheckedAt = UTCDateTimeAttribute(null=False, default=datetime.now())
    hosts = ListAttribute(null=True, default=[])

    def save(self, conditional_operator=None, **expected_values):
        self.lastCheckedAt = datetime.now()
        super(PodcastModel, self).save()


class EpisodeModel(Model):
    class Meta:
        table_name = os.environ['EPISODES_TABLE']

    podcastSlug = UnicodeAttribute(hash_key=True, null=False)
    publishTimestamp = NumberAttribute(range_key=True)
    publishedAt = UTCDateTimeAttribute(null=False)
    slug = UnicodeAttribute(null=False)
    guid = UnicodeAttribute(null=False)
    title = UnicodeAttribute(null=False)
    summary = UnicodeAttribute(null=False)
    episodeURL = UnicodeAttribute(null=False)
    imageURL = UnicodeAttribute(null=False)
    mp3URL = UnicodeAttribute(null=True)
    m4aURL = UnicodeAttribute(null=True)
    oggURL = UnicodeAttribute(null=True)
    duration = NumberAttribute(null=True)
    totalStatements = NumberAttribute(null=True)
    watsonTranscription = UnicodeAttribute(null=True)
    awsTranscription = UnicodeAttribute(null=True)
    splits = ListAttribute(null=True, default=[])
    splitAWSTranscriptions = ListAttribute(null=True, default=[])
    splitWatsonTranscriptions = ListAttribute(null=True, default=[])
    createdAt = UTCDateTimeAttribute(null=False, default=datetime.now())
    lastModifiedAt = UTCDateTimeAttribute(null=False, default=datetime.now())
    speakers = ListAttribute(null=True, default=[])

    def save(self, conditional_operator=None, **expected_values):
        self.lastModifiedAt = datetime.now()
        super(EpisodeModel, self).save()


class StatementModel(Model):
    class Meta:
        table_name = os.environ['STATEMENTS_TABLE']

    episodeKey = UnicodeAttribute(hash_key=True, null=False)
    endTime = NumberAttribute(range_key=True)
    startTime = NumberAttribute(null=False)
    speaker = NumberAttribute(null=False)
    words = ListAttribute()


class SpeakerModel(Model):
    class Meta:
        table_name = os.environ['SPEAKERS_TABLE']

    slug = UnicodeAttribute(hash_key=True, null=False)
    name = UnicodeAttribute(null=False)
    avatar = UnicodeAttribute(null=False)
