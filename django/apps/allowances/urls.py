from django.urls import path
from .views import AllowanceGetAllowances
from .views import AllowanceAdd
from .views import AllowanceDetail
from .views import AllowanceUpdate
from .views import AllowanceDelete

urlpatterns = [
    path('api/allowances/get/allowance/', AllowanceGetAllowances.as_view()),
    path('api/allowances/add/', AllowanceAdd.as_view()),
    path('api/allowances/get/allowance/<int:pk>/', AllowanceDetail.as_view()),
    path('api/allowances/update/<int:pk>/', AllowanceUpdate.as_view()),
    path('api/allowances/delete/<int:pk>/', AllowanceDelete.as_view()),
]
