from django.urls import path
from .views import CheckEmailView
from .views import GoogleTokenView
from .views import MeView
from .views import GoogleMeView
from .views import UserGetUsers
from .views import UserAdd
from .views import UserDetail
from .views import UserUpdate
from .views import UserDelete

urlpatterns = [
    path('api/users/check-email/', CheckEmailView.as_view()),
    path("api/token/google/", GoogleTokenView.as_view()),
    path('api/users/me/', MeView.as_view()),
    path('api/users/me/google/', GoogleMeView.as_view()),
    path('api/users/get/user/', UserGetUsers.as_view()),
    path('api/users/add/', UserAdd.as_view()),
    path('api/users/get/user/<int:pk>/', UserDetail.as_view()),
    path('api/users/update/<int:pk>/', UserUpdate.as_view()),
    path('api/users/delete/<int:pk>/', UserDelete.as_view()),
]
