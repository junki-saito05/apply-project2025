from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from apps.accounts.utils import verify_google_token
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import EmailTokenObtainPairSerializer

User = get_user_model()

class CheckEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        email = request.data.get("email")
        exists = User.objects.filter(email=email).exists()
        return Response({"is_registered": exists}, status=status.HTTP_200_OK)

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
