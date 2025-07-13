from rest_framework import serializers
from .models import AllowanceMaster

class AllowanceSerializer(serializers.ModelSerializer):
    condition_label = serializers.SerializerMethodField()
    time_hm = serializers.SerializerMethodField()

    class Meta:
        model = AllowanceMaster
        fields = [
            'id',
            'name',
            'condition',
            'condition_label',
            'time',
            'time_hm',
            'amount',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_condition_label(self, obj):
        return obj.get_condition_display() if hasattr(obj, 'get_condition_display') else str(obj.condition)

    def get_time_hm(self, obj):
        if obj.time is None:
            return ''
        return obj.time.strftime('%H:%M')

class AllowanceFormSerializer(serializers.ModelSerializer):
    time = serializers.TimeField(allow_null=True, required=False)

    class Meta:
        model = AllowanceMaster
        fields = ['name', 'amount', 'condition', 'time', 'is_active']
