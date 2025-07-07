from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveAPIView, UpdateAPIView, DestroyAPIView
from .models import Department
from .serializers import DepartmentSerializer
from .serializers import DepartmentFormSerializer
from .serializers import DepartmentSerializer
from django.utils import timezone


class DepartmentGetDepartments(APIView):
    def get(self, request):
        qs = Department.objects.filter(deleted_at__isnull=True)

        # 検索条件
        name = request.GET.get('name')
        if name:
            qs = qs.filter(name__icontains=name)

        level = request.GET.get('level')
        if level:
            qs = qs.filter(level=level)

        division = request.GET.get('division')
        if division:
            qs = qs.filter(parent_id=division)

        serializer = DepartmentSerializer(qs, many=True)
        return Response(serializer.data)

class DepartmentGetDivision(APIView):
    def get(self, request):
        # level=2（事業部）のみ取得
        divisions = Department.objects.filter(level=2, deleted_at__isnull=True)
        serializer = DepartmentSerializer(divisions, many=True)
        return Response(serializer.data)

class DepartmentAdd(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = DepartmentFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                created_by=request.user.id,
                updated_by=request.user.id,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DepartmentDetail(RetrieveAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class DepartmentUpdate(UpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Department.objects.all()
    serializer_class = DepartmentFormSerializer
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.id)

class DepartmentDelete(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def perform_destroy(self, instance):
        instance.deleted_by = self.request.user.id
        instance.deleted_at = timezone.now()
        instance.save()
