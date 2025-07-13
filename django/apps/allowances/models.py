from django.db import models

class Condition(models.IntegerChoices):
    DEPARTURE = 1, '出発時間'
    ARRIVAL = 2, '到着時間'
    OVERNIGHT = 3, '日跨ぎ'

class AllowanceMaster(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=50)
    amount = models.IntegerField()
    condition = models.IntegerField(choices=Condition.choices)
    time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'allowance_masters'

    def __str__(self):
        return self.name
