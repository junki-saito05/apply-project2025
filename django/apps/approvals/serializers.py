from rest_framework import serializers
from .models import ApprovalRouteMaster, ApprovalStepMaster
from apps.departments.models import Department
from apps.accounts.models import Position
from django.utils import timezone

class ApprovalStepMasterSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(allow_null=True, required=False)

    # department_id を受け取り、department にマッピング
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        allow_null=True,
        required=False
    )

    class Meta:
        model = ApprovalStepMaster
        fields = [
            'step_number',
            'step_type',
            'position',
            'department_id'
        ]

class ApprovalRouteMasterSerializer(serializers.ModelSerializer):
    steps = ApprovalStepMasterSerializer(many=True, write_only=True)

    class Meta:
        model = ApprovalRouteMaster
        fields = [
            'id',
            'name',
            'description',
            'steps',
        ]

    def create(self, validated_data):
        # stepsを分離
        steps_data = validated_data.pop('steps')
        # ユーザーコンテキストを取得
        created_by = self.context['created_by']
        updated_by = self.context['updated_by']
        # ルート作成
        route = ApprovalRouteMaster.objects.create(
            **validated_data,
            created_by=created_by,
            updated_by=updated_by,
        )
        # 各ステップ作成
        for step in steps_data:
            ApprovalStepMaster.objects.create(
                approval_route_master=route,
                created_by=created_by,
                updated_by=updated_by,
                **step,
            )
        return route

class ApprovalStepSerializer(serializers.ModelSerializer):
    position_name = serializers.SerializerMethodField()
    department_id = serializers.IntegerField(source="department.id", required=False, allow_null=True)
    department_name = serializers.SerializerMethodField()
    step_type_label = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalStepMaster
        fields = [
            'step_number',
            'step_type',
            'step_type_label',
            'position',
            'position_name',
            'department_id',
            'department_name',
        ]

    def get_position_name(self, obj):
        if obj.position is None:
            return None
        return Position(obj.position).label if hasattr(Position, 'label') else str(obj.get_position_display())

    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        return None

    def get_step_type_label(self, obj):
        return obj.get_step_type_display() if hasattr(obj, 'get_step_type_display') else str(obj.step_type)


class ApprovalRouteSerializer(serializers.ModelSerializer):
    steps = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRouteMaster
        fields = [
            'id',
            'name',
            'description',
            'created_at',
            'updated_at',
            'steps',
        ]

    def get_steps(self, obj):
        # 論理削除されていないステップのみ取得
        active_steps = obj.steps.filter(deleted_at__isnull=True).order_by('step_number')
        return ApprovalStepSerializer(active_steps, many=True).data

# 編集・登録用
class ApprovalStepMasterFormSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(allow_null=True, required=False)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        allow_null=True,
        required=False
    )

    class Meta:
        model = ApprovalStepMaster
        fields = [
            'step_number',
            'step_type',
            'position',
            'department_id',
        ]

class ApprovalRouteFormSerializer(serializers.ModelSerializer):
    steps = ApprovalStepMasterFormSerializer(many=True, write_only=True)

    class Meta:
        model = ApprovalRouteMaster
        fields = [
            'name',
            'description',
            'steps',
        ]

    def update(self, instance, validated_data):
        steps_data = validated_data.pop('steps', [])
        updated_by = self.context['updated_by']

        # 承認ルート自体の更新
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.updated_by = updated_by
        instance.save()

        existing_steps = list(instance.steps.filter(deleted_at__isnull=True).order_by('step_number'))
        new_steps_count = len(steps_data)
        existing_steps_count = len(existing_steps)

        # 1. 上書き対象（既存数 ∩ 新規数）
        for i in range(min(existing_steps_count, new_steps_count)):
            step_obj = existing_steps[i]
            step_data = steps_data[i]
            step_obj.step_number = step_data['step_number']
            step_obj.step_type = step_data['step_type']
            step_obj.position = step_data.get('position', None)
            step_obj.department = step_data.get('department', None)
            step_obj.updated_by = updated_by
            step_obj.save()

        # 2. 追加対象（新規数 > 既存数）
        for i in range(existing_steps_count, new_steps_count):
            step_data = steps_data[i]
            ApprovalStepMaster.objects.create(
                approval_route_master=instance,
                step_number=step_data['step_number'],
                step_type=step_data['step_type'],
                position=step_data.get('position'),
                department=step_data.get('department'),
                created_by=updated_by,
                updated_by=updated_by,
            )

        # 3. 論理削除対象（既存数 > 新規数）
        for i in range(new_steps_count, existing_steps_count):
            step_obj = existing_steps[i]
            step_obj.deleted_at = timezone.now()
            step_obj.deleted_by = updated_by
            step_obj.updated_by = updated_by
            step_obj.save()

        return instance
