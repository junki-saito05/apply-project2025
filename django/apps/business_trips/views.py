import os
import requests
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import DestroyAPIView
from apps.business_trips.models import BusinessTripRequest, BusinessTripExpenseHistory, AllowanceHistory, ApprovalHistory
from apps.accounts.models import User, Position
from apps.departments.models import Department
from apps.approvals.models import ApprovalStepMaster
from django.db import transaction
from django.db.models import Q
from django.db.models import Max
from django.shortcuts import get_object_or_404
from apps.business_trips.serializers import BusinessTripRequestListSerializer, BusinessTripRequestPreApplyDetailSerializer, ApprovalActionSerializer, ApprovalActionSerializer, BusinessTripRequestWithRouteSerializer, BusinessTripRequestApplyDetailSerializer
from django.conf import settings
from django.utils import timezone

def get_first_approver(approval_route_master_id, applicant_department_id):
    # 最初の承認ステップ（承認ステップのみ）
    first_step = ApprovalStepMaster.objects.filter(
        approval_route_master_id=approval_route_master_id,
        step_type=1  # 承認ステップのみ
    ).order_by('step_number').first()

    if not first_step:
        return None

    # position一致 & 申請者と同じ部署 & 未削除
    users = User.objects.filter(
        position=first_step.position,
        department_id=applicant_department_id,
        deleted_at__isnull=True
    )

    # 承認ルートにdepartment指定がある場合はさらに絞る
    if first_step.department:
        users = users.filter(department=first_step.department)

    return users.order_by('id').first()

class BusinessTripRequestPreApplyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        params = request.query_params

        # .envから特別部署IDをリストとして取得
        SPECIAL_DEPARTMENT_IDS = settings.SPECIAL_DEPARTMENT_IDS
        raw_special_dept_ids = getattr(settings, 'SPECIAL_DEPARTMENT_IDS', [])
        if isinstance(raw_special_dept_ids, str):
            SPECIAL_DEPARTMENT_IDS = [int(i) for i in raw_special_dept_ids.split(',') if i.strip().isdigit()]
        else:
            SPECIAL_DEPARTMENT_IDS = raw_special_dept_ids

        # ユーザー所属情報
        user_department_id = user.department_id
        user_position = user.position  # 1:社長, 2:事業部長, 3:課長, 4:一般

        # 基本フィルタ: 事前申請かつ論理削除されていない
        q_base = Q(request_type=BusinessTripRequest.RequestType.PRE_APPLY) & Q(deleted_at__isnull=True)

        # ユーザー権限による申請範囲の絞り込み
        if user_department_id in SPECIAL_DEPARTMENT_IDS:
            # 特別部署ならすべての申請
            qs = BusinessTripRequest.objects.filter(q_base)
        elif user_position == Position.PRESIDENT:  # 1
            # 社長なら全件
            qs = BusinessTripRequest.objects.filter(q_base)
        else:
            # それ以外は自分の申請 + 部下の申請を取得
            q_myself = Q(request_user_id=user.id)

            dept_ids = []
            if user_position == Position.DIVISION_MANAGER:  # 事業部長, 2
                try:
                    dept = Department.objects.get(id=user_department_id)
                except Department.DoesNotExist:
                    dept = None

                if dept and dept.level == 2:
                    # 事業部配下の課一覧を取得
                    section_depts = Department.objects.filter(parent_id=dept.id, level=3)
                    dept_ids = list(section_depts.values_list('id', flat=True))
            elif user_position == Position.SECTION_MANAGER:  # 課長, 3
                dept_ids = [user_department_id]

            q_subordinates = Q()
            if dept_ids:
                sub_users = User.objects.filter(department_id__in=dept_ids).values_list('id', flat=True)
                q_subordinates = Q(request_user_id__in=sub_users)

            qs = BusinessTripRequest.objects.filter(q_base & (q_myself | q_subordinates))

        # 追加検索フィルタパラメータの適用
        status = params.get('status')
        title = params.get('title')
        applicant = params.get('applicant')
        destination = params.get('destination')

        if status:
            qs = qs.filter(status=status)
        if title:
            qs = qs.filter(title__icontains=title)
        if applicant:
            qs = qs.filter(request_user__username__icontains=applicant)
        if destination:
            qs = qs.filter(destination__icontains=destination)

        # 残りの処理（パフォーマンス向上/ソート/シリアライズ）
        qs = qs.select_related('request_user').order_by('-created_at').distinct()

        serializer = BusinessTripRequestListSerializer(qs, many=True)
        return Response(serializer.data)

class BusinessTripRequestGetPreApplyDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        trip_request = get_object_or_404(BusinessTripRequest, pk=pk, deleted_at__isnull=True)

        serializer = BusinessTripRequestPreApplyDetailSerializer(trip_request)
        return Response(serializer.data)

class BusinessTripRequestPreApplyCreateView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        data = request.data
        try:
            with transaction.atomic():
                trip_request = BusinessTripRequest.objects.create(
                    title=data["title"],
                    request_type=data["request_type"],
                    status=data["status"],
                    start_date=data["start_date"],
                    start_time=data["start_time"],
                    end_date=data["end_date"],
                    end_time=data["end_time"],
                    destination=data["destination"],
                    approval_route_master_id=data["approval_route_master_id"],
                    request_user_id=request.user.id,
                    created_by=request.user.id,
                    updated_by=request.user.id
                )

                for e in data.get("expenses", []):
                    BusinessTripExpenseHistory.objects.create(
                        business_trip_request=trip_request,
                        expense_type=e["expense_type"],
                        transport_mode=e.get("transport_mode"),
                        departure_place=e.get("departure_place"),
                        arrival_place=e.get("arrival_place"),
                        amount=e["amount"],
                        description=e.get("description"),
                        created_by=request.user.id,
                        updated_by=request.user.id
                    )

                for a in data.get("allowances", []):
                    AllowanceHistory.objects.create(
                        business_trip_request=trip_request,
                        allowance_master_id=a["allowance_master_id"],
                        amount=a["amount"],
                        auto_calculated=True,
                        description=a.get("description"),
                        created_by=request.user.id,
                        updated_by=request.user.id
                    )

                next_approver_user = get_first_approver(trip_request.approval_route_master_id, request.user.department_id)

                ApprovalHistory.objects.create(
                    business_trip_request=trip_request,
                    status=ApprovalHistory.Status.APPLIED,  # 0
                    comment='',
                    action_user=request.user,
                    next_user=next_approver_user,
                    created_by=request.user.id,
                    updated_by=request.user.id
                )

                return Response({"id": trip_request.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback; traceback.print_exc()
            print("CREATE ERROR!", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# 出張事前申請、却下
class BusinessTripRequestGetPreApplyReject(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            instance = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({"detail": "該当の申請がありません"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")

        instance.status = BusinessTripRequest.Status.REJECTED
        instance.save(update_fields=["status"])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            status=ApprovalHistory.Status.REJECTED,
            comment=comment,
            action_user=request.user,
            next_user=instance.request_user,
            created_by=request.user.id,
            updated_by=request.user.id
        )

        result_serializer = BusinessTripRequestWithRouteSerializer(instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)

# 承認
class BusinessTripRequestGetPreApplyApprove(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        try:
            instance = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({"detail": "該当の申請がありません"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")

        steps = list(instance.approval_route_master.steps.order_by("step_number"))
        histories = list(instance.approvalhistory_set.order_by("created_at"))

        def is_step_done(step):
            expected_status = BusinessTripRequest.Status.APPROVED if step.step_type == 1 else BusinessTripRequest.Status.CONFIRMED  # 3 or 4
            return any(h.approval_step_master_id == step.id and h.status == expected_status for h in histories)

        # 未完了ステップ
        pending_steps = [s for s in steps if not is_step_done(s)]
        pending_approval_steps = [s for s in pending_steps if s.step_type == 1]

        is_final_approve = False
        next_approver_id = None
        next_step = None
        this_step = None

        # 対象ステップを特定
        if pending_approval_steps:
            for s in pending_approval_steps:
                if s.position == request.user.position and (s.department_id is None or s.department_id == request.user.department_id):
                    already_acted = any(h.approval_step_master_id == s.id and h.action_user_id == request.user.id for h in histories)
                    if not already_acted:
                        this_step = s
                        break

            if this_step is None:
                return Response({"detail": "承認対象ステップが見つかりません"}, status=400)

            after_my_approve = [s for s in pending_approval_steps if s.step_number > this_step.step_number]

            if after_my_approve:
                next_step = after_my_approve[0]
            else:
                remaining_confirm_steps = [s for s in pending_steps if s.step_type == 2 and s.step_number > this_step.step_number]
                next_step = remaining_confirm_steps[0] if remaining_confirm_steps else None
                is_final_approve = True
        else:
            is_final_approve = True
            remaining_confirm_steps = [s for s in pending_steps if s.step_type == 2]
            next_step = remaining_confirm_steps[0] if remaining_confirm_steps else None

        # 次の承認者を探す
        if next_step:
            users = User.objects.filter(
                position=next_step.position,
                is_active=True,
                deleted_at__isnull=True
            )

            if next_step.department:
                # ステップに部門指定がある場合：その部門のみ
                users = users.filter(department=next_step.department)
            elif next_step.position != Position.PRESIDENT:
                # ステップに部門指定なしかつ社長以外（課長・事業部長など）：申請者の課 or 事業部
                section_dept = instance.request_user.department
                if section_dept:
                    dept_ids = [section_dept.id]
                    if section_dept.parent:
                        dept_ids.append(section_dept.parent.id)
                    users = users.filter(department_id__in=dept_ids)

            users = users.order_by("id")
            user = users.first()

            if user and user.id != request.user.id:
                next_approver_id = user.id

        instance.status = BusinessTripRequest.Status.APPROVED if is_final_approve else 1
        instance.save(update_fields=["status"])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            approval_step_master_id=this_step.id if this_step else None,
            status=ApprovalHistory.Status.APPROVED,  # 3
            comment=comment,
            action_user=request.user,
            next_user_id=next_approver_id,
            created_by=request.user.id,
            updated_by=request.user.id
        )

        result_serializer = BusinessTripRequestWithRouteSerializer(instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)

class BusinessTripRequestPreApplyUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        data = request.data
        try:
            with transaction.atomic():
                trip_request = get_object_or_404(BusinessTripRequest, pk=pk, request_user_id=request.user.id)

                trip_request.title = data.get("title", trip_request.title)
                trip_request.start_date = data.get("start_date", trip_request.start_date)
                trip_request.start_time = data.get("start_time", trip_request.start_time)
                trip_request.end_date = data.get("end_date", trip_request.end_date)
                trip_request.end_time = data.get("end_time", trip_request.end_time)
                trip_request.destination = data.get("destination", trip_request.destination)
                trip_request.approval_route_master_id = data.get("approval_route_master_id", trip_request.approval_route_master_id)
                trip_request.updated_by = request.user.id
                trip_request.status = BusinessTripRequest.Status.PENDING  # 1
                trip_request.save()

                # BusinessTripExpenseHistoryの差分処理
                new_expenses_data = data.get("expenses", [])
                existing_expenses = list(BusinessTripExpenseHistory.objects.filter(business_trip_request=trip_request, deleted_at__isnull=True))

                # 既存経費をidで辞書化（nullなら除外）
                existing_expenses_map = {e.id: e for e in existing_expenses if e.id is not None}

                # 更新済IDリスト管理
                processed_expense_ids = set()

                for exp_data in new_expenses_data:
                    exp_id = exp_data.get('id')
                    if exp_id and exp_id in existing_expenses_map:
                        # 更新対象
                        exp_obj = existing_expenses_map[exp_id]
                        exp_obj.expense_type = exp_data['expense_type']
                        exp_obj.transport_mode = exp_data.get('transport_mode')
                        exp_obj.departure_place = exp_data.get('departure_place')
                        exp_obj.arrival_place = exp_data.get('arrival_place')
                        exp_obj.amount = exp_data['amount']
                        exp_obj.description = exp_data.get('description')
                        exp_obj.updated_by = request.user.id
                        exp_obj.save()
                        processed_expense_ids.add(exp_id)
                    else:
                        # 新規登録
                        BusinessTripExpenseHistory.objects.create(
                            business_trip_request=trip_request,
                            expense_type=exp_data['expense_type'],
                            transport_mode=exp_data.get('transport_mode'),
                            departure_place=exp_data.get('departure_place'),
                            arrival_place=exp_data.get('arrival_place'),
                            amount=exp_data['amount'],
                            description=exp_data.get('description'),
                            created_by=request.user.id,
                            updated_by=request.user.id,
                        )

                # 論理削除：存在しなくなった経費をdeleted_at, deleted_by設定
                for exp_obj in existing_expenses:
                    if exp_obj.id not in processed_expense_ids:
                        exp_obj.deleted_at = timezone.now()
                        exp_obj.deleted_by = request.user.id
                        exp_obj.updated_by = request.user.id
                        exp_obj.save()

                # AllowanceHistoryの差分処理（ほぼ上記と同様）
                new_allowances_data = data.get("allowances", [])
                existing_allowances = list(AllowanceHistory.objects.filter(business_trip_request=trip_request, deleted_at__isnull=True))
                existing_allowances_map = {a.id: a for a in existing_allowances if a.id is not None}
                processed_allowance_ids = set()

                for a_data in new_allowances_data:
                    a_id = a_data.get('id')
                    if a_id and a_id in existing_allowances_map:
                        a_obj = existing_allowances_map[a_id]
                        a_obj.allowance_master_id = a_data['allowance_master_id']
                        a_obj.amount = a_data['amount']
                        a_obj.auto_calculated = a_data.get('auto_calculated', True)
                        a_obj.description = a_data.get('description')
                        a_obj.updated_by = request.user.id
                        a_obj.save()
                        processed_allowance_ids.add(a_id)
                    else:
                        AllowanceHistory.objects.create(
                            business_trip_request=trip_request,
                            allowance_master_id=a_data['allowance_master_id'],
                            amount=a_data['amount'],
                            auto_calculated=a_data.get('auto_calculated', True),
                            description=a_data.get('description'),
                            created_by=request.user.id,
                            updated_by=request.user.id,
                        )

                for a_obj in existing_allowances:
                    if a_obj.id not in processed_allowance_ids:
                        a_obj.deleted_at = timezone.now()
                        a_obj.deleted_by = request.user.id
                        a_obj.updated_by = request.user.id
                        a_obj.save()

                next_approver_user = get_first_approver(trip_request.approval_route_master_id, request.user.department_id)

                ApprovalHistory.objects.create(
                    business_trip_request=trip_request,
                    status=ApprovalHistory.Status.APPLIED,  # 再申請の状態コード 0
                    comment=data.get("comment", ""),
                    action_user=request.user,
                    next_user=next_approver_user,
                    created_by=request.user.id,
                    updated_by=request.user.id,
                )

                return Response({"id": trip_request.id}, status=200)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=400)

# 確認
class BusinessTripRequestPreApplyConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        comment = request.data.get('comment', '')

        try:
            btr = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({'error': '申請が存在しません'}, status=status.HTTP_404_NOT_FOUND)

        # ステップと履歴を取得
        steps = list(btr.approval_route_master.steps.order_by("step_number"))
        histories = list(btr.approvalhistory_set.order_by("created_at"))

        # 完了判定関数
        def is_step_done(step):
            expected_status = BusinessTripRequest.Status.APPROVED if step.step_type == 1 else BusinessTripRequest.Status.CONFIRMED  # 3 or 4
            return any(h.approval_step_master_id == step.id and h.status == expected_status for h in histories)

        # 確認ステップ（step_type = 2）の中から自分が担当のものを探す
        confirm_steps = [s for s in steps if s.step_type == 2 and not is_step_done(s)]

        this_step = None
        for s in confirm_steps:
            if s.position == user.position and (s.department_id is None or s.department_id == user.department_id):
                already_acted = any(
                    h.approval_step_master_id == s.id and h.action_user_id == user.id for h in histories
                )
                if not already_acted:
                    this_step = s
                    break

        if this_step is None:
            return Response({'detail': '確認対象ステップが見つかりません'}, status=400)

        # ApprovalHistory 作成
        ApprovalHistory.objects.create(
            business_trip_request=btr,
            approval_step_master=this_step,
            action_user=user,
            status=ApprovalHistory.Status.CONFIRMED,  # 4
            comment=comment,
            created_by=user.id,
            updated_by=user.id,
        )

        # すべてのステップが完了していれば申請全体のステータスを更新
        if all(is_step_done(step) for step in steps):
            btr.status = 3
            btr.save(update_fields=["status"])

        return Response({'detail': '確認を記録しました'}, status=status.HTTP_200_OK)

#　削除
class BusinessTripRequestPreApplyDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = BusinessTripRequest.objects.filter(deleted_at__isnull=True)
    serializer_class = BusinessTripRequestListSerializer

    def perform_destroy(self, instance):
        user = self.request.user
        now = timezone.now()

        # 論理削除：BusinessTripRequest
        instance.deleted_by = user.id
        instance.deleted_at = now
        instance.updated_by = user.id
        instance.save()

        # 関連モデルの論理削除
        ApprovalHistory.objects.filter(
            business_trip_request=instance, deleted_at__isnull=True
        ).update(
            deleted_by=user.id,
            deleted_at=now,
            updated_by=user.id,
        )

        BusinessTripExpenseHistory.objects.filter(
            business_trip_request=instance, deleted_at__isnull=True
        ).update(
            deleted_by=user.id,
            deleted_at=now,
            updated_by=user.id,
        )

        AllowanceHistory.objects.filter(
            business_trip_request=instance, deleted_at__isnull=True
        ).update(
            deleted_by=user.id,
            deleted_at=now,
            updated_by=user.id,
        )

        return Response({'detail': '申請を削除しました'}, status=status.HTTP_200_OK)

class BusinessTripRequestGetApprovedPreApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_id = request.query_params.get('current_id')
        current_parent_id = request.query_params.get('current_parent_id')

        if current_id:
            # その申請の申請者IDを取得
            try:
                target_user_id = BusinessTripRequest.objects.values_list(
                    'request_user_id', flat=True
                ).get(id=current_id)
            except BusinessTripRequest.DoesNotExist:
                return Response({"detail": "申請が存在しません"}, status=404)
        else:
            # 新規申請時はログインユーザーID
            target_user_id = request.user.id

        # すでに精算申請で使われたparent_request_id一覧を取得
        used_parent_ids_qs = BusinessTripRequest.objects.filter(
            request_type=BusinessTripRequest.RequestType.APPLY,  # 精算申請 2
            deleted_at__isnull=True,
            parent_request_id__isnull=False
        )

        # 現在表示中のparent_request_idは除外対象から外す
        if current_parent_id:
            used_parent_ids_qs = used_parent_ids_qs.exclude(parent_request_id=current_parent_id)

        used_parent_ids = used_parent_ids_qs.values_list('parent_request_id', flat=True)

        requests = BusinessTripRequest.objects.filter(
            request_user=target_user_id,
            request_type=BusinessTripRequest.RequestType.PRE_APPLY,  # 事前申請 1
            status=BusinessTripRequest.Status.APPROVED,              # 承認済み 3
            deleted_at__isnull=True
        ).exclude(id__in=used_parent_ids).order_by('-id')

        serializer = BusinessTripRequestPreApplyDetailSerializer(requests, many=True)
        return Response(serializer.data)

# 出張精算新規申請
class BusinessTripRequestApplyCreateView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        data = request.data
        try:
            with transaction.atomic():
                trip_request = BusinessTripRequest.objects.create(
                    title=data["title"],
                    request_type=data["request_type"],
                    status=data["status"],
                    start_date=data["start_date"],
                    start_time=data["start_time"],
                    end_date=data["end_date"],
                    end_time=data["end_time"],
                    destination=data["destination"],
                    approval_route_master_id=data["approval_route_master_id"],
                    request_user_id=request.user.id,
                    parent_request_id=data["parent_request_id"],
                    created_by=request.user.id,
                    updated_by=request.user.id
                )

                for e in data.get("expenses", []):
                    BusinessTripExpenseHistory.objects.create(
                        business_trip_request=trip_request,
                        expense_type=e["expense_type"],
                        transport_mode=e.get("transport_mode"),
                        departure_place=e.get("departure_place"),
                        arrival_place=e.get("arrival_place"),
                        amount=e["amount"],
                        description=e.get("description"),
                        created_by=request.user.id,
                        updated_by=request.user.id
                    )

                for a in data.get("allowances", []):
                    AllowanceHistory.objects.create(
                        business_trip_request=trip_request,
                        allowance_master_id=a["allowance_master_id"],
                        amount=a["amount"],
                        auto_calculated=True,
                        description=a.get("description"),
                        created_by=request.user.id,
                        updated_by=request.user.id
                    )

                next_approver_user = get_first_approver(trip_request.approval_route_master_id, request.user.department_id)

                ApprovalHistory.objects.create(
                    business_trip_request=trip_request,
                    status=ApprovalHistory.Status.APPLIED,  # 申請 0
                    comment='',
                    action_user=request.user,
                    next_user=next_approver_user,
                    created_by=request.user.id,
                    updated_by=request.user.id
                )

                return Response({"id": trip_request.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback; traceback.print_exc()
            print("CREATE ERROR!", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# 出張精算申請、一覧取得
class BusinessTripRequestApplyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        params = request.query_params

        # .envから特別部署IDをリストとして取得
        SPECIAL_DEPARTMENT_IDS = settings.SPECIAL_DEPARTMENT_IDS
        raw_special_dept_ids = getattr(settings, 'SPECIAL_DEPARTMENT_IDS', [])
        if isinstance(raw_special_dept_ids, str):
            SPECIAL_DEPARTMENT_IDS = [int(i) for i in raw_special_dept_ids.split(',') if i.strip().isdigit()]
        else:
            SPECIAL_DEPARTMENT_IDS = raw_special_dept_ids

        # ユーザー所属情報
        user_department_id = user.department_id
        user_position = user.position  # 1:社長, 2:事業部長, 3:課長, 4:一般

        # 基本フィルタ: 精算申請かつ論理削除されていない
        q_base = Q(request_type=BusinessTripRequest.RequestType.APPLY) & Q(deleted_at__isnull=True)

        # ユーザー権限による申請範囲の絞り込み
        if user_department_id in SPECIAL_DEPARTMENT_IDS:
            # 特別部署ならすべての申請
            qs = BusinessTripRequest.objects.filter(q_base)
        elif user_position == Position.PRESIDENT:  # 1
            # 社長なら全件
            qs = BusinessTripRequest.objects.filter(q_base)
        else:
            # それ以外は自分の申請 + 部下の申請を取得
            q_myself = Q(request_user_id=user.id)

            dept_ids = []
            if user_position == Position.DIVISION_MANAGER:  # 事業部長, 2
                try:
                    dept = Department.objects.get(id=user_department_id)
                except Department.DoesNotExist:
                    dept = None

                if dept and dept.level == 2:
                    # 事業部配下の課一覧を取得
                    section_depts = Department.objects.filter(parent_id=dept.id, level=3)
                    dept_ids = list(section_depts.values_list('id', flat=True))
            elif user_position == Position.SECTION_MANAGER:  # 課長, 3
                dept_ids = [user_department_id]

            q_subordinates = Q()
            if dept_ids:
                sub_users = User.objects.filter(department_id__in=dept_ids).values_list('id', flat=True)
                q_subordinates = Q(request_user_id__in=sub_users)

            qs = BusinessTripRequest.objects.filter(q_base & (q_myself | q_subordinates))

        # 追加検索フィルタパラメータの適用
        status = params.get('status')
        title = params.get('title')
        applicant = params.get('applicant')
        destination = params.get('destination')

        if status:
            qs = qs.filter(status=status)
        if title:
            qs = qs.filter(title__icontains=title)
        if applicant:
            qs = qs.filter(request_user__username__icontains=applicant)
        if destination:
            qs = qs.filter(destination__icontains=destination)

        # 残りの処理（パフォーマンス向上/ソート/シリアライズ）
        qs = qs.select_related('request_user').order_by('-created_at').distinct()

        serializer = BusinessTripRequestListSerializer(qs, many=True)
        return Response(serializer.data)

# 出張精算申請、詳細取得
class BusinessTripRequestGetApplyDetail(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        trip_request = get_object_or_404(BusinessTripRequest, pk=pk, deleted_at__isnull=True)

        serializer = BusinessTripRequestApplyDetailSerializer(trip_request)
        return Response(serializer.data)

# 出張精算申請、却下
class BusinessTripRequestGetApplyReject(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            instance = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({"detail": "該当の申請がありません"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")

        instance.status = BusinessTripRequest.Status.REJECTED
        instance.save(update_fields=["status"])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            status=ApprovalHistory.Status.REJECTED,
            comment=comment,
            action_user=request.user,
            next_user=instance.request_user,
            created_by=request.user.id,
            updated_by=request.user.id
        )

        result_serializer = BusinessTripRequestWithRouteSerializer(instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)

# 出張精算申請、承認
class BusinessTripRequestGetApplyApprove(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):

        try:
            instance = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({"detail": "該当の申請がありません"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")

        steps = list(instance.approval_route_master.steps.order_by("step_number"))
        histories = list(instance.approvalhistory_set.order_by("created_at"))

        def is_step_done(step):
            expected_status = BusinessTripRequest.Status.APPROVED if step.step_type == 1 else BusinessTripRequest.Status.CONFIRMED  # 3 or 4
            return any(h.approval_step_master_id == step.id and h.status == expected_status for h in histories)

        # 未完了ステップ
        pending_steps = [s for s in steps if not is_step_done(s)]
        pending_approval_steps = [s for s in pending_steps if s.step_type == 1]

        is_final_approve = False
        next_approver_id = None
        next_step = None
        this_step = None

        # 対象ステップを特定
        if pending_approval_steps:
            for s in pending_approval_steps:
                if s.position == request.user.position and (s.department_id is None or s.department_id == request.user.department_id):
                    already_acted = any(h.approval_step_master_id == s.id and h.action_user_id == request.user.id for h in histories)
                    if not already_acted:
                        this_step = s
                        break

            if this_step is None:
                return Response({"detail": "承認対象ステップが見つかりません"}, status=400)

            after_my_approve = [s for s in pending_approval_steps if s.step_number > this_step.step_number]

            if after_my_approve:
                next_step = after_my_approve[0]
            else:
                remaining_confirm_steps = [s for s in pending_steps if s.step_type == 2 and s.step_number > this_step.step_number]
                next_step = remaining_confirm_steps[0] if remaining_confirm_steps else None
                is_final_approve = True
        else:
            is_final_approve = True
            remaining_confirm_steps = [s for s in pending_steps if s.step_type == 2]
            next_step = remaining_confirm_steps[0] if remaining_confirm_steps else None

        # 次の承認者を探す
        if next_step:
            users = User.objects.filter(
                position=next_step.position,
                is_active=True,
                deleted_at__isnull=True
            )

            if next_step.department:
                # ステップに部門指定がある場合：その部門のみ
                users = users.filter(department=next_step.department)
            elif next_step.position != Position.PRESIDENT:
                # ステップに部門指定なしかつ社長以外（課長・事業部長など）：申請者の課 or 事業部
                section_dept = instance.request_user.department
                if section_dept:
                    dept_ids = [section_dept.id]
                    if section_dept.parent:
                        dept_ids.append(section_dept.parent.id)
                    users = users.filter(department_id__in=dept_ids)

            users = users.order_by("id")
            user = users.first()

            if user and user.id != request.user.id:
                next_approver_id = user.id

        instance.status = BusinessTripRequest.Status.APPROVED if is_final_approve else BusinessTripRequest.Status.PENDING  # 承認済 3, 承認待ち 1
        instance.save(update_fields=["status"])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            approval_step_master_id=this_step.id if this_step else None,
            status=ApprovalHistory.Status.APPROVED, # 3
            comment=comment,
            action_user=request.user,
            next_user_id=next_approver_id,
            created_by=request.user.id,
            updated_by=request.user.id
        )

        result_serializer = BusinessTripRequestWithRouteSerializer(instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)

# 出張精算申請、再申請
class BusinessTripRequestApplyUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        data = request.data
        try:
            with transaction.atomic():
                trip_request = get_object_or_404(BusinessTripRequest, pk=pk, request_user_id=request.user.id)

                trip_request.title = data.get("title", trip_request.title)
                trip_request.start_date = data.get("start_date", trip_request.start_date)
                trip_request.start_time = data.get("start_time", trip_request.start_time)
                trip_request.end_date = data.get("end_date", trip_request.end_date)
                trip_request.end_time = data.get("end_time", trip_request.end_time)
                trip_request.destination = data.get("destination", trip_request.destination)
                trip_request.approval_route_master_id = data.get("approval_route_master_id", trip_request.approval_route_master_id)
                trip_request.parent_request_id = data.get("parent_request_id", trip_request.parent_request_id)
                trip_request.updated_by = request.user.id
                trip_request.status = BusinessTripRequest.Status.PENDING # 1
                trip_request.save()

                # BusinessTripExpenseHistoryの差分処理
                new_expenses_data = data.get("expenses", [])
                existing_expenses = list(BusinessTripExpenseHistory.objects.filter(business_trip_request=trip_request, deleted_at__isnull=True))

                # 既存経費をidで辞書化（nullなら除外）
                existing_expenses_map = {e.id: e for e in existing_expenses if e.id is not None}

                # 更新済IDリスト管理
                processed_expense_ids = set()

                for exp_data in new_expenses_data:
                    exp_id = exp_data.get('id')
                    if exp_id and exp_id in existing_expenses_map:
                        # 更新対象
                        exp_obj = existing_expenses_map[exp_id]
                        exp_obj.expense_type = exp_data['expense_type']
                        exp_obj.transport_mode = exp_data.get('transport_mode')
                        exp_obj.departure_place = exp_data.get('departure_place')
                        exp_obj.arrival_place = exp_data.get('arrival_place')
                        exp_obj.amount = exp_data['amount']
                        exp_obj.description = exp_data.get('description')
                        exp_obj.updated_by = request.user.id
                        exp_obj.save()
                        processed_expense_ids.add(exp_id)
                    else:
                        # 新規登録
                        BusinessTripExpenseHistory.objects.create(
                            business_trip_request=trip_request,
                            expense_type=exp_data['expense_type'],
                            transport_mode=exp_data.get('transport_mode'),
                            departure_place=exp_data.get('departure_place'),
                            arrival_place=exp_data.get('arrival_place'),
                            amount=exp_data['amount'],
                            description=exp_data.get('description'),
                            created_by=request.user.id,
                            updated_by=request.user.id,
                        )

                # 論理削除：存在しなくなった経費をdeleted_at, deleted_by設定
                for exp_obj in existing_expenses:
                    if exp_obj.id not in processed_expense_ids:
                        exp_obj.deleted_at = timezone.now()
                        exp_obj.deleted_by = request.user.id
                        exp_obj.updated_by = request.user.id
                        exp_obj.save()

                # AllowanceHistoryの差分処理（ほぼ上記と同様）
                new_allowances_data = data.get("allowances", [])
                existing_allowances = list(AllowanceHistory.objects.filter(business_trip_request=trip_request, deleted_at__isnull=True))
                existing_allowances_map = {a.id: a for a in existing_allowances if a.id is not None}
                processed_allowance_ids = set()

                for a_data in new_allowances_data:
                    a_id = a_data.get('id')
                    if a_id and a_id in existing_allowances_map:
                        a_obj = existing_allowances_map[a_id]
                        a_obj.allowance_master_id = a_data['allowance_master_id']
                        a_obj.amount = a_data['amount']
                        a_obj.auto_calculated = a_data.get('auto_calculated', True)
                        a_obj.description = a_data.get('description')
                        a_obj.updated_by = request.user.id
                        a_obj.save()
                        processed_allowance_ids.add(a_id)
                    else:
                        AllowanceHistory.objects.create(
                            business_trip_request=trip_request,
                            allowance_master_id=a_data['allowance_master_id'],
                            amount=a_data['amount'],
                            auto_calculated=a_data.get('auto_calculated', True),
                            description=a_data.get('description'),
                            created_by=request.user.id,
                            updated_by=request.user.id,
                        )

                for a_obj in existing_allowances:
                    if a_obj.id not in processed_allowance_ids:
                        a_obj.deleted_at = timezone.now()
                        a_obj.deleted_by = request.user.id
                        a_obj.updated_by = request.user.id
                        a_obj.save()

                next_approver_user = get_first_approver(trip_request.approval_route_master_id, request.user.department_id)

                ApprovalHistory.objects.create(
                    business_trip_request=trip_request,
                    status=ApprovalHistory.Status.APPLIED,  # 再申請 0
                    comment=data.get("comment", ""),
                    action_user=request.user,
                    next_user=next_approver_user,
                    created_by=request.user.id,
                    updated_by=request.user.id,
                )

                return Response({"id": trip_request.id}, status=200)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": str(e)}, status=400)

# 出張精算申請、確認
class BusinessTripRequestApplyConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        comment = request.data.get('comment', '')

        try:
            btr = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({'error': '申請が存在しません'}, status=status.HTTP_404_NOT_FOUND)

        # ステップと履歴を取得
        steps = list(btr.approval_route_master.steps.order_by("step_number"))
        histories = list(btr.approvalhistory_set.order_by("created_at"))

        # 完了判定関数
        def is_step_done(step):
            expected_status = BusinessTripRequest.Status.APPROVED if step.step_type == 1 else BusinessTripRequest.Status.CONFIRMED  # 3 or 4
            return any(h.approval_step_master_id == step.id and h.status == expected_status for h in histories)

        # 確認ステップ（step_type = 2）の中から自分が担当のものを探す
        confirm_steps = [s for s in steps if s.step_type == 2 and not is_step_done(s)]

        this_step = None
        for s in confirm_steps:
            if s.position == user.position and (s.department_id is None or s.department_id == user.department_id):
                already_acted = any(
                    h.approval_step_master_id == s.id and h.action_user_id == user.id for h in histories
                )
                if not already_acted:
                    this_step = s
                    break

        if this_step is None:
            return Response({'detail': '確認対象ステップが見つかりません'}, status=400)

        # ApprovalHistory 作成
        ApprovalHistory.objects.create(
            business_trip_request=btr,
            approval_step_master=this_step,
            action_user=user,
            status=ApprovalHistory.Status.CONFIRMED,  # 4
            comment=comment,
            created_by=user.id,
            updated_by=user.id,
        )

        # すべてのステップが完了していれば申請全体のステータスを更新
        if all(is_step_done(step) for step in steps):
            btr.status = BusinessTripRequest.Status.APPROVED  # 3
            btr.save(update_fields=["status"])

        return Response({'detail': '確認を記録しました'}, status=status.HTTP_200_OK)

#　出張精算申請、削除
class BusinessTripRequestApplyDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = BusinessTripRequest.objects.filter(deleted_at__isnull=True)
    serializer_class = BusinessTripRequestListSerializer

    def perform_destroy(self, instance):
        user = self.request.user
        now = timezone.now()

        # 論理削除：BusinessTripRequest
        instance.deleted_by = user.id
        instance.deleted_at = now
        instance.updated_by = user.id
        instance.save()

        # 関連モデルの論理削除
        ApprovalHistory.objects.filter(
            business_trip_request=instance, deleted_at__isnull=True
        ).update(
            deleted_by=user.id,
            deleted_at=now,
            updated_by=user.id,
        )

        BusinessTripExpenseHistory.objects.filter(
            business_trip_request=instance, deleted_at__isnull=True
        ).update(
            deleted_by=user.id,
            deleted_at=now,
            updated_by=user.id,
        )

        AllowanceHistory.objects.filter(
            business_trip_request=instance, deleted_at__isnull=True
        ).update(
            deleted_by=user.id,
            deleted_at=now,
            updated_by=user.id,
        )

        return Response({'detail': '申請を削除しました'}, status=status.HTTP_200_OK)


# 出張精算申請、精算済処理
class BusinessTripRequestApplySettle(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            instance = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({"detail": "該当の申請がありません"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")

        instance.status = BusinessTripRequest.Status.SETTLED  # 精算済、5
        instance.save(update_fields=["status"])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            status=ApprovalHistory.Status.SETTLED,  # 精算済、5
            comment=comment,
            action_user=request.user,
            next_user=instance.request_user,
            created_by=request.user.id,
            updated_by=request.user.id
        )

        result_serializer = BusinessTripRequestWithRouteSerializer(instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)

# 最新履歴の承認待ちリクエストを取得
def get_pending_trip_requests(user, request_type):
    # ①申請全体が承認待ち（status=PENDING）のものをまず抽出
    pending_requests_qs = BusinessTripRequest.objects.filter(
        status=BusinessTripRequest.Status.PENDING,
        request_type=request_type,
        deleted_at__isnull=True
    ).values('id')

    if not pending_requests_qs.exists():
        return BusinessTripRequest.objects.none()

    # ②それらに紐づく最新 ApprovalHistory の id を取得
    latest_histories_qs = (
        ApprovalHistory.objects
        .filter(
            business_trip_request_id__in=pending_requests_qs,
            deleted_at__isnull=True
        )
        .values('business_trip_request_id')
        .annotate(latest_id=Max('id'))
    )
    latest_ids = [row['latest_id'] for row in latest_histories_qs]

    if not latest_ids:
        return BusinessTripRequest.objects.none()

    # ③最新履歴の中で next_user が自分のものを抽出
    my_latest_pending_ids = ApprovalHistory.objects.filter(
        id__in=latest_ids,
        next_user=user,
        deleted_at__isnull=True
    ).values_list('business_trip_request_id', flat=True)

    if not my_latest_pending_ids:
        return BusinessTripRequest.objects.none()

    # ④最終的に BusinessTripRequest を返す
    return (
        BusinessTripRequest.objects
        .filter(
            id__in=my_latest_pending_ids,
            request_type=request_type,
            status=BusinessTripRequest.Status.PENDING,
            deleted_at__isnull=True
        )
        .select_related('request_user')
        .order_by('-created_at')
    )

# 出張事前申請、ダッシュボード表示用
class BusinessTripRequestPendingPreApplyList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trip_requests = get_pending_trip_requests(
            request.user,
            BusinessTripRequest.RequestType.PRE_APPLY
        )
        serializer = BusinessTripRequestListSerializer(trip_requests, many=True)
        return Response(serializer.data)


# 出張精算申請、ダッシュボード表示用
class BusinessTripRequestPendingApplyList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trip_requests = get_pending_trip_requests(
            request.user,
            BusinessTripRequest.RequestType.APPLY
        )
        serializer = BusinessTripRequestListSerializer(trip_requests, many=True)
        return Response(serializer.data)
