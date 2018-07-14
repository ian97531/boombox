import os
from datetime import datetime

from pynamodb.attributes import NumberAttribute, UnicodeAttribute, UTCDateTimeAttribute
from pynamodb.models import Model

class JobModel(Model):
    class Meta:
        table_name = os.environ['ACTIVE_JOBS_TABLE']

    jobId = UnicodeAttribute(hash_key=True, null=False)
    startedAt = UTCDateTimeAttribute(range_key=True, default=datetime.now())
    podcast = UnicodeAttribute(null=False)
    episode = UnicodeAttribute(null=False)
    duration = NumberAttribute()
    updatedAt = UTCDateTimeAttribute(null=False)

    def save(self, conditional_operator=None, **expected_values):
        self.updatedAt = datetime.now()
        super(JobModel, self).save()