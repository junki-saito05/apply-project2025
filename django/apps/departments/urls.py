from django.urls import path
from .views import DepartmentGetDepartments
from .views import DepartmentGetDivision
from .views import DepartmentAdd
from .views import DepartmentDetail
from .views import DepartmentUpdate
from .views import DepartmentDelete

urlpatterns = [
    path('api/departments/get/department/', DepartmentGetDepartments.as_view()),
    path('api/departments/get/division/', DepartmentGetDivision.as_view()),
    path('api/departments/add/', DepartmentAdd.as_view()),
    path('api/departments/get/department/<int:pk>/', DepartmentDetail.as_view()),
    path('api/departments/update/<int:pk>/', DepartmentUpdate.as_view()),
    path('api/departments/delete/<int:pk>/', DepartmentDelete.as_view()),
]
