from django.urls import path
from .views import CheckEmailView
from .views import MeView
from .views import GoogleMeView

urlpatterns = [
    path('api/users/check-email/', CheckEmailView.as_view()),
    path('api/users/me/', MeView.as_view()),
    path('api/users/me/google/', GoogleMeView.as_view()),
]
