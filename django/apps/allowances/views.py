from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveAPIView, UpdateAPIView, DestroyAPIView
from .models import AllowanceMaster
from django.shortcuts import render
from .serializers import AllowanceFormSerializer
from .serializers import AllowanceSerializer
from django.utils import timezone

class AllowanceGetAllowances(APIView):
    def get(self, request):
        qs = AllowanceMaster.objects.filter(deleted_at__isnull=True)

        # 検索条件
        name = request.GET.get('name')
        if name:
            qs = qs.filter(name__icontains=name)

        condition = request.GET.get('condition')
        if condition:
            qs = qs.filter(condition=condition)

        is_active = request.GET.get('is_active')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        serializer = AllowanceSerializer(qs.order_by('-created_at'), many=True)
        return Response(serializer.data)

class AllowanceAdd(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = AllowanceFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                created_by=request.user.id,
                updated_by=request.user.id,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def validate(self, attrs):
        condition = attrs.get('condition')
        time = attrs.get('time')

        # 出発時間または到着時間の場合、timeは必須
        if condition in [1, 2]:
            if time is None:
                raise serializers.ValidationError({'time': '時間は必須です。'})
            # 30分単位チェック
            if time.minute not in (0, 30) or time.second != 0 or time.microsecond != 0:
                raise serializers.ValidationError({'time': '時間は30分単位で入力してください。'})
        else:
            # 日跨ぎなど、timeが入力されていれば30分単位かチェック
            if time is not None:
                if time.minute not in (0, 30) or time.second != 0 or time.microsecond != 0:
                    raise serializers.ValidationError({'time': '時間は30分単位で入力してください。'})
        return attrs

class AllowanceDetail(RetrieveAPIView):
    queryset = AllowanceMaster.objects.all()
    serializer_class = AllowanceSerializer

class AllowanceUpdate(UpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AllowanceMaster.objects.all()
    serializer_class = AllowanceFormSerializer
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.id)

class AllowanceDelete(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AllowanceMaster.objects.all()
    serializer_class = AllowanceSerializer

    def perform_destroy(self, instance):
        instance.deleted_by = self.request.user.id
        instance.deleted_at = timezone.now()
        instance.save()
