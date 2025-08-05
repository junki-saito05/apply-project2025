from django.db import models
from apps.accounts.models import User
from apps.allowances.models import AllowanceMaster
from apps.approvals.models import ApprovalRouteMaster, ApprovalStepMaster
from django.utils import timezone

class BusinessTripRequest(models.Model):
    REQUEST_TYPE_CHOICES = [
        (1, '事前申請'),
        (2, '精算申請'),
    ]

    STATUS_CHOICES = [
        (1, '承認待ち'),
        (2, '却下'),
        (3, '承認済'),
        (4, '精算済'),
    ]

    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=50)
    parent_request = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column='parent_request_id',
        related_name='child_requests',
        help_text='事前申請と紐づけるため'
    )
    request_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        db_column='request_user_id',
        related_name='business_trip_requests',
        verbose_name='申請者'
    )
    approval_route_master = models.ForeignKey(
        ApprovalRouteMaster,
        on_delete=models.PROTECT,
        db_column='approval_route_master_id',
        related_name='business_trip_requests',
        verbose_name='承認ルート'
    )
    request_type = models.PositiveSmallIntegerField(choices=REQUEST_TYPE_CHOICES)
    status = models.PositiveSmallIntegerField(choices=STATUS_CHOICES)
    destination = models.CharField(max_length=50)
    start_date = models.DateField()
    start_time = models.TimeField()
    end_date = models.DateField()
    end_time = models.TimeField()

    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'business_trip_requests'

class ApprovalHistory(models.Model):
    STATUS_CHOICES = [
        (0, '申請'),
        (1, '承認待ち'),
        (2, '却下'),
        (3, '承認済'),
        (4, '確認済'),
        (5, '精算済'),
    ]

    id = models.BigAutoField(primary_key=True)
    business_trip_request = models.ForeignKey(
        BusinessTripRequest,
        on_delete=models.CASCADE,
        db_column='business_trip_request_id'
    )
    action_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='acted_approval_histories',
        db_column='action_user_id',
        verbose_name='アクションユーザー',
        help_text='申請や承認を行ったユーザー',
    )
    next_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='pending_approval_histories',
        db_column='next_user_id',
        verbose_name='次アクションユーザー',
        help_text='次に承認や確認を行うことが期待されているユーザー',
    )
    approval_step_master = models.ForeignKey(
        ApprovalStepMaster,
        on_delete=models.CASCADE,
        db_column='approval_step_master_id',
        null=True,
        blank=True
    )
    status = models.PositiveSmallIntegerField(choices=STATUS_CHOICES, default=0)
    comment = models.TextField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'approval_histories'
        ordering = ['created_at']

    def __str__(self):
        return f"ApprovalHistory(id={self.id}, status={self.get_status_display()}, action_user={self.action_user}, next_user={self.next_user})"

class BusinessTripExpenseHistory(models.Model):
    EXPENSE_TYPE_CHOICES = [
        (1, '交通費'),
        (2, 'ホテル代'),
    ]

    TRANSPORT_MODE_CHOICES = [
        (1, '電車'),
        (2, 'バス'),
        (3, '飛行機'),
        (4, '社用車'),
        (5, 'フェリー'),
        (6, 'タクシー'),
        (7, 'レンタカー'),
        (99, 'その他'),
    ]

    id = models.BigAutoField(primary_key=True)
    business_trip_request = models.ForeignKey(
        BusinessTripRequest,
        on_delete=models.CASCADE,
        db_column='business_trip_request_id'
    )
    expense_type = models.PositiveSmallIntegerField(choices=EXPENSE_TYPE_CHOICES)
    transport_mode = models.PositiveSmallIntegerField(
        choices=TRANSPORT_MODE_CHOICES, null=True, blank=True
    )
    departure_place = models.CharField(max_length=50, null=True, blank=True)
    arrival_place = models.CharField(max_length=50, null=True, blank=True)
    amount = models.IntegerField()
    description = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'business_trip_expense_histories'

class AllowanceHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    business_trip_request = models.ForeignKey(
        BusinessTripRequest,
        on_delete=models.CASCADE,
        db_column='business_trip_request_id'
    )
    allowance_master = models.ForeignKey(
        AllowanceMaster,
        on_delete=models.PROTECT,
        db_column='allowance_master_id',
        related_name='allowance_histories',
        verbose_name='手当マスタ'
    )
    amount = models.IntegerField()
    auto_calculated = models.BooleanField(default=True)
    description = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.BigIntegerField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.BigIntegerField()
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'allowance_histories'
