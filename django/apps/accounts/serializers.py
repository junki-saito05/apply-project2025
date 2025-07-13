from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from .models import User
from apps.departments.models import Department

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

class UserFormSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True
    )
    password = serializers.CharField(write_only=True, min_length=8, max_length=30)
    has_master_permission = serializers.BooleanField()

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'department_id',
            'position',
            'has_master_permission',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # パスワードをハッシュ化
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    position_label = serializers.SerializerMethodField()
    has_master_permission_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'department',
            'department_name',
            'position',
            'position_label',
            'has_master_permission',
            'has_master_permission_display',
            'created_at',
            'updated_at',
        ]

    def get_position_label(self, obj):
        return obj.get_position_display()

    def get_has_master_permission_display(self, obj):
        return 'あり' if obj.has_master_permission else 'なし'

class UserUpdateSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='department',
        write_only=True
    )
    password = serializers.CharField(write_only=True, min_length=8, max_length=30, required=False, allow_blank=True)
    has_master_permission = serializers.BooleanField()

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'department_id',
            'position',
            'has_master_permission',
        ]

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
