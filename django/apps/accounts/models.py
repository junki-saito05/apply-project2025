from django.contrib.auth.models import AbstractUser
from django.db import models

class Position(models.IntegerChoices):
    PRESIDENT = 1, '社長'
    DIVISION_MANAGER = 2, '事業部長'
    SECTION_MANAGER = 3, '課長'
    STAFF = 4, '一般'

class User(AbstractUser):
    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(unique=True)
    department = models.ForeignKey('departments.Department', on_delete=models.PROTECT, db_column='department_id')
    position = models.IntegerField(
        choices=Position.choices,
        default=Position.STAFF,
    )
    has_master_permission = models.BooleanField(default=False)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.name
