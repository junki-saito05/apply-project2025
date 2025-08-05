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
from django.shortcuts import get_object_or_404
from apps.business_trips.serializers import BusinessTripRequestListSerializer, BusinessTripRequestPreApplyDetailSerializer, ApprovalActionSerializer, ApprovalActionSerializer, BusinessTripRequestWithRouteSerializer
from django.conf import settings
from django.utils import timezone
import logging

def get_first_approver(approval_route_master_id):
    # 承認ステップの中でstep_numberが最小かつ承認ステップ（step_type=1）を取得
    first_step = ApprovalStepMaster.objects.filter(
        approval_route_master_id=approval_route_master_id,
        step_type=1  # 承認ステップのみ
    ).order_by('step_number').first()

    if not first_step:
        return None

    # ステップに紐づく position, department でユーザーを絞り込み
    users = User.objects.filter(position=first_step.position, deleted_at__isnull=True)

    if first_step.department:
        users = users.filter(department=first_step.department)

    # 該当ユーザーが複数いるかもしれないので、先頭の1人を返す
    return users.first()

class BusinessTripRequestPreApplyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        params = request.query_params

        # TODO:環境変数にする
        SPECIAL_DEPARTMENT_IDS = [1,8,9,10]
        # .envから特別部署IDをリストとして取得
        # SPECIAL_DEPARTMENT_IDS = settings.SPECIAL_DEPARTMENT_IDS
        # raw_special_dept_ids = getattr(settings, 'SPECIAL_DEPARTMENT_IDS', [])
        # if isinstance(raw_special_dept_ids, str):
        #     SPECIAL_DEPARTMENT_IDS = [int(i) for i in raw_special_dept_ids.split(',') if i.strip().isdigit()]
        # else:
        #     SPECIAL_DEPARTMENT_IDS = raw_special_dept_ids

        print("SPECIAL_DEPARTMENT_IDS:", SPECIAL_DEPARTMENT_IDS)
        # ユーザー所属情報
        user_department_id = user.department_id
        user_position = user.position  # 1:社長, 2:事業部長, 3:課長, 4:一般

        # 基本フィルタ: 事前申請かつ論理削除されていない
        q_base = Q(request_type=1) & Q(deleted_at__isnull=True)

        # ユーザー権限による申請範囲の絞り込み
        if user_department_id in SPECIAL_DEPARTMENT_IDS:
            # 特別部署ならすべての申請
            qs = BusinessTripRequest.objects.filter(q_base)
        elif user_position == 1:
            # 社長なら全件
            qs = BusinessTripRequest.objects.filter(q_base)
        else:
            # それ以外は自分の申請 + 部下の申請を取得
            q_myself = Q(request_user_id=user.id)

            dept_ids = []
            if user_position == 2:  # 事業部長
                try:
                    dept = Department.objects.get(id=user_department_id)
                except Department.DoesNotExist:
                    dept = None

                if dept and dept.level == 2:
                    # 事業部配下の課一覧を取得
                    section_depts = Department.objects.filter(parent_id=dept.id, level=3)
                    dept_ids = list(section_depts.values_list('id', flat=True))
            elif user_position == 3:  # 課長
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
            print("REQUEST DATA:", data)
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
                print("Created trip_request:", trip_request)

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

                next_approver_user = get_first_approver(trip_request.approval_route_master_id)

                print("Next approver is:", next_approver_user)
                ApprovalHistory.objects.create(
                    business_trip_request=trip_request,
                    status=0,
                    comment='',
                    action_user=request.user,
                    next_user=next_approver_user,          # TODO: 実際の次承認者を設定するロジックを検討
                    created_by=request.user.id,
                    updated_by=request.user.id
                )

                return Response({"id": trip_request.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback; traceback.print_exc()
            print("CREATE ERROR!", e)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class BusinessTripRequestViewSet(viewsets.ModelViewSet):
    queryset = BusinessTripRequest.objects.all()
    serializer_class = BusinessTripRequestPreApplyDetailSerializer
    # 省略

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get('comment', '')

        user = request.user

        # 最新の承認履歴を取得（承認待ちのもの）
        pending_histories = instance.approval_histories.filter(status=0).order_by('created_at')
        if not pending_histories.exists():
            return Response({'detail': '承認待ちの履歴がありません'}, status=status.HTTP_400_BAD_REQUEST)

        current_history = pending_histories.first()

        # 承認ルートのステップを入手
        # なお、承認ルートの取得方法は管理している仕様による（仮に関数を使う）
        approval_route_id = instance.approval_route_master_id
        approval_steps = get_approval_steps(approval_route_id)  # 例 function or queryset

        # 現在の承認者のステップ位置を特定（positionなどで照合する想定）
        current_position = current_history.action_user.position  # 要調整：action_userの役職？

        # 以降の承認ステップに「承認(1)」があるか判定
        next_steps = [step for step in approval_steps if step.position > current_position]
        has_next_approve = any(step.step_type == 1 for step in next_steps)
        has_next_confirm_only = all(step.step_type == 3 for step in next_steps) and next_steps

        # ステータス変更の判定
        if has_next_approve:
            new_status = 1  # 変更なし(承認待ち)
        elif has_next_confirm_only or not next_steps:
            new_status = 3  # 最終承認(完了)

        # 次の承認者IDを求める（もし存在すれば）
        next_approver = None
        if next_steps:
            # 承認または確認の最初のステップのユーザーIDを取得(例)
            next_approver = get_user_id_by_step(next_steps[0])  # 実装次第

        # ビジネスロジックでstatus設定と履歴追加
        instance.status = new_status
        instance.save(update_fields=['status'])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            status=new_status,
            comment=comment,
            action_user=user,
            next_user_id=next_approver,
        )
        return Response({'detail': '承認処理が完了しました'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        instance = self.get_object()
        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get('comment', '')

        user = request.user

        instance.status = 2  # 却下ステータス
        instance.save(update_fields=['status'])

        # 申請者id
        requester_id = instance.request_user.id if instance.request_user else None

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            status=2,
            comment=comment,
            action_user=user,
            next_user_id=requester_id,
        )
        return Response({'detail': '却下処理が完了しました'})

# 却下
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

        instance.status = 2  # 却下
        instance.save(update_fields=["status"])

        print(f"ApprovalHistory登録処理開始: user={request.user.id}, comment={comment}")

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            status=2,
            comment=comment,
            action_user=request.user,
            next_user=instance.request_user,
            created_by=request.user.id,
            updated_by=request.user.id
        )

        print("ApprovalHistory登録完了")

        result_serializer = BusinessTripRequestWithRouteSerializer(instance)
        return Response(result_serializer.data, status=status.HTTP_200_OK)


# 承認
class BusinessTripRequestGetPreApplyApprove(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        logger = logging.getLogger(__name__)

        try:
            instance = BusinessTripRequest.objects.get(pk=pk)
        except BusinessTripRequest.DoesNotExist:
            return Response({"detail": "該当の申請がありません"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get("comment", "")

        steps = list(instance.approval_route_master.steps.order_by("step_number"))
        histories = list(instance.approvalhistory_set.order_by("created_at"))

        print("▼ Steps (approval_route_master.steps):")
        for s in steps:
            print(f"  step_number={s.step_number}, step_type={s.step_type}, position={s.position}, department_id={s.department_id}, id={s.id}")

        print("▼ Histories (approvalhistory_set):")
        for h in histories:
            print(f"  id={h.id}, status={h.status}, user_id={h.action_user_id}, position={h.action_user.position}, department_id={h.action_user.department_id}, created_at={h.created_at}, step_id={h.approval_step_master_id}")

        def is_step_done(step):
            expected_status = 3 if step.step_type == 1 else 4
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

            print("▼ next_step.position:", next_step.position)
            print("▼ next_step.department_id:", next_step.department_id)
            print("▼ 候補ユーザー:", list(users.values("id", "username", "department_id")))
            print("▼ 選ばれたユーザー:", user.id if user else None)

            if user and user.id != request.user.id:
                next_approver_id = user.id

        instance.status = 3 if is_final_approve else 1
        instance.save(update_fields=["status"])

        ApprovalHistory.objects.create(
            business_trip_request=instance,
            approval_step_master_id=this_step.id if this_step else None,
            status=3,
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
                trip_request.status = 1
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

                next_approver_user = get_first_approver(trip_request.approval_route_master_id)

                ApprovalHistory.objects.create(
                    business_trip_request=trip_request,
                    status=0,  # 再申請の状態コード
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
            expected_status = 3 if step.step_type == 1 else 4
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
            status=4,
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
