from django.urls import path
from . import views
from .views import BusinessTripRequestPreApplyCreateView
from .views import BusinessTripRequestPreApplyListView
from .views import BusinessTripRequestGetPreApplyDetail
from .views import BusinessTripRequestGetPreApplyReject
from .views import BusinessTripRequestGetPreApplyApprove
from .views import BusinessTripRequestPreApplyUpdateView
from .views import BusinessTripRequestPreApplyConfirmView
from .views import BusinessTripRequestPreApplyDeleteView
from .views import BusinessTripRequestGetApprovedPreApplyView
from .views import BusinessTripRequestApplyCreateView
from .views import BusinessTripRequestApplyListView
from .views import BusinessTripRequestGetApplyDetail
from .views import BusinessTripRequestGetApplyReject
from .views import BusinessTripRequestGetApplyApprove
from .views import BusinessTripRequestApplyUpdateView
from .views import BusinessTripRequestApplyConfirmView
from .views import BusinessTripRequestApplyDeleteView
from .views import BusinessTripRequestApplySettle
from .views import BusinessTripRequestPendingPreApplyList
from .views import BusinessTripRequestPendingApplyList

urlpatterns = [
    path('api/business-trip-requests/pre-apply/create/', BusinessTripRequestPreApplyCreateView.as_view()),
    path('api/business-trip-requests/pre-apply/get/', BusinessTripRequestPreApplyListView.as_view()),
    path("api/business-trip-requests/pre-apply/detail/<int:pk>/", BusinessTripRequestGetPreApplyDetail.as_view()),
    path("api/business-trip-requests/reject/<int:pk>/", BusinessTripRequestGetPreApplyReject.as_view()),
    path("api/business-trip-requests/approve/<int:pk>/", BusinessTripRequestGetPreApplyApprove.as_view()),
    path("api/business-trip-requests/pre-apply/update/<int:pk>/", BusinessTripRequestPreApplyUpdateView.as_view()),
    path("api/business-trip-requests/pre-apply/confirm/<int:pk>/", BusinessTripRequestPreApplyConfirmView.as_view()),
    path("api/business-trip-requests/pre-apply/delete/<int:pk>/", BusinessTripRequestPreApplyDeleteView.as_view()),
    path("api/business-trip-requests/pre-apply/approved/", BusinessTripRequestGetApprovedPreApplyView.as_view()),
    path('api/business-trip-requests/apply/create/', BusinessTripRequestApplyCreateView.as_view()),
    path('api/business-trip-requests/apply/get/', BusinessTripRequestApplyListView.as_view()),
    path("api/business-trip-requests/apply/detail/<int:pk>/", BusinessTripRequestGetApplyDetail.as_view()),
    path("api/business-trip-requests/apply/reject/<int:pk>/", BusinessTripRequestGetApplyReject.as_view()),
    path("api/business-trip-requests/apply/approve/<int:pk>/", BusinessTripRequestGetApplyApprove.as_view()),
    path("api/business-trip-requests/apply/update/<int:pk>/", BusinessTripRequestApplyUpdateView.as_view()),
    path("api/business-trip-requests/apply/confirm/<int:pk>/", BusinessTripRequestApplyConfirmView.as_view()),
    path("api/business-trip-requests/apply/delete/<int:pk>/", BusinessTripRequestApplyDeleteView.as_view()),
    path("api/business-trip-requests/apply/settle/<int:pk>/", BusinessTripRequestApplySettle.as_view()),
    path("api/business-trip-apply/pending-pre-applies/", BusinessTripRequestPendingPreApplyList.as_view()),
    path("api/business-trip-apply/pending-applies/", BusinessTripRequestPendingApplyList.as_view()),
]
