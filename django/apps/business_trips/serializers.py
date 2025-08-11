from rest_framework import serializers
from apps.business_trips.models import BusinessTripRequest, BusinessTripExpenseHistory, AllowanceHistory, ApprovalHistory
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.departments.models import Department
from apps.approvals.models import ApprovalRouteMaster, ApprovalStepMaster

class BusinessTripRequestListSerializer(serializers.ModelSerializer):
    request_user = serializers.SerializerMethodField()

    class Meta:
        model = BusinessTripRequest
        fields = [
            'id', 'title', 'status', 'destination',
            'start_date', 'end_date', 'created_at', 'updated_at', 'request_user'
        ]

    def get_request_user(self, obj):
        return {
            "id": obj.request_user.id,
            "username": obj.request_user.username,
        }

class BusinessTripExpenseHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessTripExpenseHistory
        fields = [
            'id',
            'expense_type',
            'transport_mode',
            'departure_place',
            'arrival_place',
            'amount',
            'description',
        ]


class AllowanceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowanceHistory
        fields = [
            'id',
            'allowance_master_id',
            'amount',
            'auto_calculated',
            'description',
        ]

class ApprovalHistorySerializer(serializers.ModelSerializer):
    next_user_id = serializers.IntegerField(source='next_user.id', read_only=True)
    next_user_name = serializers.CharField(source='next_user.username', read_only=True)
    action_user_id = serializers.IntegerField(source='action_user.id', read_only=True)
    action_user_name = serializers.CharField(source='action_user.username', read_only=True)
    action_user_position = serializers.IntegerField(source='action_user.position', read_only=True)
    step_type = serializers.SerializerMethodField()
    step_number = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalHistory
        fields = [
            'id', 'status', 'comment', 'created_at', 'updated_at',
            'next_user_id', 'next_user_name', 'action_user_id', 'action_user_name', 'action_user_position',
            'step_type', 'step_number',
        ]

    def get_step_type(self, obj):
        # 最新の履歴がどのstepに該当するかを判定
        request = obj.business_trip_request
        if not request or not obj.action_user:
            return None
        matched_step = ApprovalStepMaster.objects.filter(
            approval_route_master_id=request.approval_route_master_id,
            position=obj.action_user.position,
            department_id=getattr(obj.action_user, "department_id", None)
        ).first()
        return matched_step.step_type if matched_step else None

    def get_step_number(self, obj):
        request = obj.business_trip_request
        if not request or not obj.action_user:
            return None
        matched_step = ApprovalStepMaster.objects.filter(
            approval_route_master_id=request.approval_route_master_id,
            position=obj.action_user.position,
            department_id=getattr(obj.action_user, "department_id", None)
        ).first()
        return matched_step.step_number if matched_step else None

class BusinessTripRequestPreApplyDetailSerializer(serializers.ModelSerializer):
    request_user_id = serializers.IntegerField(source='request_user.id', read_only=True)

    # 関連明細をネスト
    expenses = BusinessTripExpenseHistorySerializer(many=True, read_only=True, source='businesstripexpensehistory_set')
    allowances = AllowanceHistorySerializer(many=True, read_only=True, source='allowancehistory_set')
    approval_histories = ApprovalHistorySerializer(many=True, source='approvalhistory_set', read_only=True)
    next_step_type = serializers.SerializerMethodField()
    next_user_id = serializers.SerializerMethodField()
    request_user = UserSerializer(read_only=True)

    class Meta:
        model = BusinessTripRequest
        fields = [
            'id',
            'title',
            'request_type',
            'status',
            'start_date',
            'start_time',
            'end_date',
            'end_time',
            'destination',
            'approval_route_master_id',
            'expenses',
            'allowances',
            'request_user_id',
            'request_user',
            'approval_histories',
            'next_step_type',
            'next_user_id',
        ]

    def get_next_step_type(self, obj):
        latest_history = obj.approvalhistory_set.order_by('-created_at').first()
        if not latest_history:
            return None

        approval_steps = obj.approval_route_master.steps.all().order_by('step_number')
        for step in approval_steps:
            if not obj.approvalhistory_set.filter(approval_step_master=step, status__in=[1, 2, 3, 4]).exists():
                return step.step_type  # 1=承認, 2=確認
        return None

    def get_next_user_id(self, obj):
        latest_history = obj.approvalhistory_set.order_by('-created_at').first()
        if not latest_history:
            return None
        return latest_history.next_user_id

    def to_representation(self, instance):
        data = super().to_representation(instance)

        expenses = data.get('expenses', [])
        allowances = data.get('allowances', [])

        # 手当明細の処理はそのまま
        for allowance in allowances:
            allowance_expense = {
                'id': allowance['id'],
                'expense_type': 3,
                'amount': allowance['amount'],
                'description': allowance.get('description', '') or '',
                'allowance_id': allowance['allowance_master_id'],
                'departure_place': '',
                'arrival_place': '',
                'transport_mode': None,
            }
            expenses.append(allowance_expense)
        data['expenses'] = expenses
        data['allowances'] = []

        # 履歴とステップを取得
        histories = list(instance.approvalhistory_set.select_related('action_user').all())
        steps = instance.approval_route_master.steps.filter(deleted_at__isnull=True).order_by('step_number')

        approval_steps = []

        # 履歴があるかチェック
        has_histories = len(histories) > 0

        for step in steps:
            approver_name = None
            if has_histories:
                # 過去履歴に基づく承認者名取得
                for history in histories:
                    if history.approval_step_master_id == step.id and history.action_user:
                        approver_name = history.action_user.username
                        break
            else:
                # 新規申請時は「次の承認ステップ」に該当する担当者名をセットする
                # 次の承認ステップは履歴がないため、最初のステップの担当者名をセットする
                # 一番最初のstepだけ名前をセットし、nullにする
                if step == steps.first():
                    # TODO: 次の承認者ユーザー名を取得する処理を入れる
                    # ここは担当者を決める仕組み次第
                    approver_name = f"次の担当者（{step.position_name or '役職不明'}）"

            approval_steps.append({
                'id': step.id,
                'step_number': step.step_number,
                'step_type': step.step_type,
                'position': step.position,
                'position_name': step.get_position_display() if hasattr(step, 'get_position_display') else '',
                'department_id': step.department_id,
                'department_name': step.department.name if step.department else '',
                'approver_name': approver_name,
            })

        data['approval_steps'] = approval_steps

        return data

class ApprovalActionSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=100, allow_blank=True, required=False)

class ApprovalStepMasterSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = ApprovalStepMaster
        fields = [
            'id', 'step_number', 'step_type', 'position', 'department_id', 'department_name'
        ]

class BusinessTripRequestWithRouteSerializer(serializers.ModelSerializer):
    approval_histories = ApprovalHistorySerializer(many=True, source='approvalhistory_set', read_only=True)
    approval_steps = serializers.SerializerMethodField()
    current_step_number = serializers.SerializerMethodField()
    is_final_approval = serializers.SerializerMethodField()
    next_approver_info = serializers.SerializerMethodField()
    expenses = BusinessTripExpenseHistorySerializer(
        many=True, read_only=True, source='businesstripexpensehistory_set'
    )
    allowances = AllowanceHistorySerializer(many=True, read_only=True, source='allowancehistory_set')

    class Meta:
        model = BusinessTripRequest
        fields = [
            'id',
            'title',
            'request_type',
            'status',
            'start_date',
            'start_time',
            'end_date',
            'end_time',
            'destination',
            'approval_route_master_id',
            'expenses',
            'allowances',
            'request_user_id',
            'approval_histories',
            'approval_steps',
            'current_step_number',
            'is_final_approval',
            'next_approver_info',
        ]

    def get_approval_steps(self, obj):
        steps = ApprovalStepMaster.objects.filter(
            approval_route_master_id=obj.approval_route_master_id
        ).order_by('step_number')
        return ApprovalStepMasterSerializer(steps, many=True).data

    def get_current_step_number(self, obj):
        histories = obj.approvalhistory_set.all().order_by('created_at')
        if not histories:
            return 1
        last_history = histories.last()
        # TODO: step_number特定ロジックがあれば実装
        return None

    def get_is_final_approval(self, obj):
        steps = ApprovalStepMaster.objects.filter(
            approval_route_master_id=obj.approval_route_master_id
        ).order_by('step_number')
        histories = obj.approvalhistory_set.all().order_by('created_at')

        approved_steps = set(
            (h.action_user.position, getattr(h.action_user, "department_id", None))
            for h in histories if h.status == 3
        )

        def is_step_approved(step, approved_steps):
            for pos, dept in approved_steps:
                if pos == step.position:
                    if step.department_id is None or dept is None or step.department_id == dept:
                        return True
            return False

        pending_steps = [
            s for s in steps
            if not is_step_approved(s, approved_steps) and s.step_type == 1
        ]

        if not pending_steps:
            return True
        if len(pending_steps) == 1:
            return True
        after_first = pending_steps[1:]
        if all(s.step_type == 2 for s in after_first):
            return True
        return False

    def get_next_approver_info(self, obj):
        steps = ApprovalStepMaster.objects.filter(
            approval_route_master_id=obj.approval_route_master_id
        ).order_by('step_number')
        histories = obj.approvalhistory_set.all().order_by('created_at')
        approved_steps = set([
            (h.action_user.position, getattr(h.action_user, "department_id", None))
            for h in histories if h.status == 1
        ])
        for s in steps:
            if (s.position, s.department_id) not in approved_steps:
                return {
                    "step_number": s.step_number,
                    "step_type": s.step_type,
                    "position": s.position,
                    "department_id": s.department_id,
                    "department_name": s.department.name if s.department else "",
                }
        return None

class BusinessTripRequestApplyDetailSerializer(serializers.ModelSerializer):
    request_user_id = serializers.IntegerField(source='request_user.id', read_only=True)

    # 関連明細をネスト
    expenses = BusinessTripExpenseHistorySerializer(many=True, read_only=True, source='businesstripexpensehistory_set')
    allowances = AllowanceHistorySerializer(many=True, read_only=True, source='allowancehistory_set')
    approval_histories = ApprovalHistorySerializer(many=True, source='approvalhistory_set', read_only=True)
    next_step_type = serializers.SerializerMethodField()
    next_user_id = serializers.SerializerMethodField()
    request_user = UserSerializer(read_only=True)

    class Meta:
        model = BusinessTripRequest
        fields = [
            'id',
            'title',
            'request_type',
            'status',
            'start_date',
            'start_time',
            'end_date',
            'end_time',
            'destination',
            'approval_route_master_id',
            'parent_request_id',
            'expenses',
            'allowances',
            'request_user_id',
            'request_user',
            'approval_histories',
            'next_step_type',
            'next_user_id',
        ]

    def get_next_step_type(self, obj):
        latest_history = obj.approvalhistory_set.order_by('-created_at').first()
        if not latest_history:
            return None

        approval_steps = obj.approval_route_master.steps.all().order_by('step_number')
        for step in approval_steps:
            if not obj.approvalhistory_set.filter(approval_step_master=step, status__in=[1, 2, 3, 4]).exists():
                return step.step_type  # 1=承認, 2=確認
        return None

    def get_next_user_id(self, obj):
        latest_history = obj.approvalhistory_set.order_by('-created_at').first()
        if not latest_history:
            return None
        return latest_history.next_user_id

    def to_representation(self, instance):
        data = super().to_representation(instance)

        expenses = data.get('expenses', [])
        allowances = data.get('allowances', [])

        # 手当明細の処理はそのまま
        for allowance in allowances:
            allowance_expense = {
                'id': allowance['id'],
                'expense_type': 3,
                'amount': allowance['amount'],
                'description': allowance.get('description', '') or '',
                'allowance_id': allowance['allowance_master_id'],
                'departure_place': '',
                'arrival_place': '',
                'transport_mode': None,
            }
            expenses.append(allowance_expense)
        data['expenses'] = expenses
        data['allowances'] = []

        # 履歴とステップを取得
        histories = list(instance.approvalhistory_set.select_related('action_user').all())
        steps = instance.approval_route_master.steps.filter(deleted_at__isnull=True).order_by('step_number')

        approval_steps = []

        # 履歴があるかチェック
        has_histories = len(histories) > 0

        for step in steps:
            approver_name = None
            if has_histories:
                # 過去履歴に基づく承認者名取得
                for history in histories:
                    if history.approval_step_master_id == step.id and history.action_user:
                        approver_name = history.action_user.username
                        break
            else:
                # 新規申請時は「次の承認ステップ」に該当する担当者名をセットする
                # 次の承認ステップは履歴がないため、最初のステップの担当者名をセットする
                # 一番最初のstepだけ名前をセットし、nullにする
                if step == steps.first():
                    # TODO: 次の承認者ユーザー名を取得する処理を入れる
                    # ここは担当者を決める仕組み次第
                    # 今は仮で部署名を表示するなどにしておく
                    approver_name = f"次の担当者（{step.position_name or '役職不明'}）"

            approval_steps.append({
                'id': step.id,
                'step_number': step.step_number,
                'step_type': step.step_type,
                'position': step.position,
                'position_name': step.get_position_display() if hasattr(step, 'get_position_display') else '',
                'department_id': step.department_id,
                'department_name': step.department.name if step.department else '',
                'approver_name': approver_name,
            })

        data['approval_steps'] = approval_steps

        return data
