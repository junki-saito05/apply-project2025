from rest_framework import serializers
from .models import Department

class DepartmentSerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'level', 'parent', 'parent_name', 'created_at', 'updated_at']

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None

    def get_created_at(self, obj):
        return obj.created_at.strftime('%Y/%m/%d') if obj.created_at else None

    def get_updated_at(self, obj):
        return obj.updated_at.strftime('%Y/%m/%d') if obj.updated_at else None

class DepartmentFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['name', 'level', 'parent']

    def validate(self, data):
        # 例: level=3のときparent必須
        if data['level'] == 3 and not data.get('parent'):
            raise serializers.ValidationError('課を作成する場合は上位事業部を指定してください。')
        return data
