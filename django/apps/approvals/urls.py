from django.urls import path
from .views import ApprovalGetApprovals
from .views import ApprovalAdd
from .views import ApprovalDetail
from .views import ApprovalUpdate
from .views import ApprovalDelete

urlpatterns = [
    path('api/approvals/get/approval/', ApprovalGetApprovals.as_view()),
    path('api/approvals/add/', ApprovalAdd.as_view()),
    path('api/approvals/get/approval/<int:pk>/', ApprovalDetail.as_view()),
    path('api/approvals/update/<int:pk>/', ApprovalUpdate.as_view()),
    path('api/approvals/delete/<int:pk>/', ApprovalDelete.as_view()),
]
