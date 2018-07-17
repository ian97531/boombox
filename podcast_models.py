import os
from datetime import datetime

from pynamodb.attributes import ListAttribute, NumberAttribute, UnicodeAttribute, UTCDateTimeAttribute
from pynamodb.models import Model

class PodcastModel(Model):
    class Meta:
        table_name = os.environ['PODCASTS_TABLE']

    feedURL = UnicodeAttribute(hash_key=True, null=False)
    title = UnicodeAttribute(null=False)
    subtitle = UnicodeAttribute(null=False)
    author = UnicodeAttribute(null=False)
    summary = UnicodeAttribute(null=False)
    category = UnicodeAttribute(null=False)
    language = UnicodeAttribute(null=False)
    imageURL = UnicodeAttribute(null=False)
    episodes = ListAttribute()
    createdAt = UTCDateTimeAttribute(null=False, default=datetime.now())
    lastModifiedAt = UTCDateTimeAttribute(null=False)
    lastCheckedAt = UTCDateTimeAttribute(null=False, default=datetime.now())

    def save(self, conditional_operator=None, **expected_values):
        self.lastCheckedAt = datetime.now()
        super(PodcastModel, self).save()


class EpisodeModel(Model):
    class Meta:
        table_name = os.environ['EPISODES_TABLE']

    guid = UnicodeAttribute(hash_key=True, null=False)
    title = UnicodeAttribute(null=False)
    summary = UnicodeAttribute(null=False)
    episodeURL = UnicodeAttribute(null=False)
    imageURL = UnicodeAttribute(null=False)
    feedURL = UnicodeAttribute(null=False)
    mp3URL = UnicodeAttribute(null=True)
    m4aURL = UnicodeAttribute(null=True)
    oggURL = UnicodeAttribute(null=True)
    duration = NumberAttribute(null=True)
    splits = ListAttribute(null=True)
    publishedAt = UTCDateTimeAttribute(null=False)
    createdAt = UTCDateTimeAttribute(null=False, default=datetime.now())
    lastModifiedAt = UTCDateTimeAttribute(null=False, default=datetime.now())

    def save(self, conditional_operator=None, **expected_values):
        self.lastModifiedAt = datetime.now()
        super(EpisodeModel, self).save()