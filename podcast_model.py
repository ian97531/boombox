import os
from datetime import datetime

from pynamodb.attributes import UnicodeAttribute, UTCDateTimeAttribute
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
    image = UnicodeAttribute(null=False)
    lastModifiedAt = UTCDateTimeAttribute(null=False)
    lastCheckedAt = UTCDateTimeAttribute(null=False)

    def save(self, conditional_operator=None, **expected_values):
        self.lastCheckedAt = datetime.now()
        super(PodcastModel, self).save()