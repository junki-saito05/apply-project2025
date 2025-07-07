from django.db import models

class DepartmentLevel(models.IntegerChoices):
    PRESIDENT = 1, '社長'
    DIVISION = 2, '事業部'
    SECTION = 3, '課'

class Department(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=20)
    parent = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        db_column='parent_id',
        related_name='children'
    )
    level = models.IntegerField(
        choices=DepartmentLevel.choices,
        default=DepartmentLevel.SECTION
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'departments'

    def __str__(self):
        return self.name
