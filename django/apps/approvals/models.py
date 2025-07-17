from django.db import models
from django.conf import settings
from apps.accounts.models import Position
from apps.departments.models import Department

class StepType(models.IntegerChoices):
    APPROVAL = 1, '承認'
    CONFIRM = 2, '確認'

class ApprovalRouteMaster(models.Model):
    name = models.CharField(max_length=30)
    description = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'approval_route_masters'
        verbose_name = '承認ルート'
        verbose_name_plural = '承認ルート'

    def __str__(self):
        return self.name

class ApprovalStepMaster(models.Model):
    approval_route_master = models.ForeignKey(
        ApprovalRouteMaster,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    step_number = models.IntegerField()
    step_type = models.PositiveSmallIntegerField(choices=StepType.choices, default=1)
    position = models.PositiveSmallIntegerField(choices=Position.choices, null=True, blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        null=True,
        db_column='department_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'approval_step_masters'
        verbose_name = '承認ステップ'
        verbose_name_plural = '承認ステップ'

    def __str__(self):
        return f"{self.approval_route_master.name} - Step {self.step_number}"
