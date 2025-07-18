from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.generics import RetrieveAPIView, UpdateAPIView, DestroyAPIView
from django.contrib.auth import get_user_model
from apps.accounts.utils import verify_google_token
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import EmailTokenObtainPairSerializer
from .serializers import UserFormSerializer
from .serializers import UserSerializer
from .serializers import UserUpdateSerializer
from rest_framework_simplejwt.tokens import RefreshToken
import google.auth.transport.requests
import google.oauth2.id_token
from django.utils import timezone

User = get_user_model()

class CheckEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        email = request.data.get("email")
        exists = User.objects.filter(email=email).exists()
        return Response({"is_registered": exists}, status=status.HTTP_200_OK)

class GoogleTokenView(APIView):
    def post(self, request):
        id_token = request.data.get("id_token")
        if not id_token:
            return Response({"detail": "ID token is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # GoogleのIDトークンを検証
            request_adapter = google.auth.transport.requests.Request()
            id_info = google.oauth2.id_token.verify_oauth2_token(id_token, request_adapter)

            # emailからユーザーを取得（存在しない場合は401）
            email = id_info.get("email")
            if not email:
                return Response({"detail": "Email not found in ID token."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"detail": "User does not exist."}, status=status.HTTP_401_UNAUTHORIZED)

            # JWT発行
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            })

        except ValueError as e:
            return Response({"detail": "Invalid ID token.", "error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'email': user.email,
            'has_master_permission': getattr(user, 'has_master_permission', False),
            'username': getattr(user, 'username'),
        })

class GoogleMeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({'detail': '認証情報がありません'}, status=status.HTTP_401_UNAUTHORIZED)
        token = auth_header.split(' ')[1]
        idinfo = verify_google_token(token)
        if not idinfo:
            return Response({'detail': 'トークンが無効です'}, status=status.HTTP_401_UNAUTHORIZED)
        email = idinfo['email']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'ユーザーが見つかりません'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'email': user.email,
            'has_master_permission': getattr(user, 'has_master_permission', False),
            'username': user.username,
        })

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

class UserGetUsers(APIView):
    def get(self, request):
        qs = User.objects.filter(deleted_at__isnull=True)

        # 検索条件
        username = request.GET.get('username')
        if username:
            qs = qs.filter(username__icontains=username)

        email = request.GET.get('email')
        if email:
            qs = qs.filter(email__icontains=email)

        department_id = request.GET.get('department_id')
        if department_id:
            qs = qs.filter(department_id=department_id)

        position = request.GET.get('position')
        if position:
            qs = qs.filter(position=position)

        serializer = UserSerializer(qs, many=True)
        return Response(serializer.data)

class UserAdd(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = UserFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                created_by=request.user.id,
                updated_by=request.user.id,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserDetail(RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class UserUpdate(UpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.id)

class UserDelete(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_destroy(self, instance):
        instance.deleted_by = self.request.user.id
        instance.deleted_at = timezone.now()
        instance.save()
