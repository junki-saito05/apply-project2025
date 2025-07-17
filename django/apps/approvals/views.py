from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveAPIView, UpdateAPIView, DestroyAPIView
from .models import ApprovalRouteMaster, ApprovalStepMaster
from django.db.models import Q
from django.shortcuts import render
from .serializers import ApprovalRouteSerializer
from .serializers import ApprovalRouteMasterSerializer
from .serializers import ApprovalRouteFormSerializer
from django.utils import timezone
from django.db import transaction

class ApprovalGetApprovals(APIView):
    def get(self, request):
        qs = ApprovalRouteMaster.objects.filter(deleted_at__isnull=True)

        # 承認ルート名での検索
        name = request.GET.get('name')
        if name:
            qs = qs.filter(name__icontains=name)

        # ステップに紐づく役職や部署でフィルタ（1件でも合致すれば対象）
        position = request.GET.get('position')
        department = request.GET.get('department')

        if position or department:
            step_q = Q()
            if position:
                step_q &= Q(steps__position=position)
            if department:
                step_q &= Q(steps__department_id=department)
            qs = qs.filter(step_q).distinct()

        qs = qs.order_by('-created_at').prefetch_related('steps')
        serializer = ApprovalRouteSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ApprovalAdd(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ApprovalRouteMasterSerializer(
            data=request.data,
            context={
                'created_by': request.user.id,
                'updated_by': request.user.id,
            },
        )
        if serializer.is_valid():
            route = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # バリデーション失敗時 → printを実行し、その後エラーを返す
        print("バリデーションエラー:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ApprovalDetail(RetrieveAPIView):
    queryset = ApprovalRouteMaster.objects.filter(deleted_at__isnull=True)
    serializer_class = ApprovalRouteSerializer

class ApprovalUpdate(UpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ApprovalRouteMaster.objects.all()
    serializer_class = ApprovalRouteFormSerializer
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({
            'updated_by': self.request.user.id
        })
        return context

class ApprovalDelete(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ApprovalRouteMaster.objects.all()
    serializer_class = ApprovalRouteSerializer

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        now = timezone.now()

        # 承認ルートの論理削除
        instance.deleted_by = user_id
        instance.deleted_at = now
        instance.save()

        # 関連ステップの論理削除（すでに削除されていないもののみ対象）
        instance.steps.filter(deleted_at__isnull=True).update(
            deleted_by=user_id,
            deleted_at=now,
            updated_by=user_id,
        )
