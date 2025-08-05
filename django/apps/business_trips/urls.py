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

urlpatterns = [
    path('api/business-trip-requests/pre-apply/create/', BusinessTripRequestPreApplyCreateView.as_view()),
    path('api/business-trip-requests/pre-apply/get/', BusinessTripRequestPreApplyListView.as_view()),
    path("api/business-trip-requests/pre-apply/detail/<int:pk>/", BusinessTripRequestGetPreApplyDetail.as_view()),
    path("api/businesstriprequests/<int:pk>/reject/", BusinessTripRequestGetPreApplyReject.as_view()),
    path("api/businesstriprequests/<int:pk>/approve/", BusinessTripRequestGetPreApplyApprove.as_view()),
    path("api/business-trip-requests/pre-apply/update/<int:pk>/", BusinessTripRequestPreApplyUpdateView.as_view()),
    path("api/business-trip-requests/pre-apply/confirm/<int:pk>/", BusinessTripRequestPreApplyConfirmView.as_view()),
    path("api/business-trip-requests/pre-apply/delete/<int:pk>/", BusinessTripRequestPreApplyDeleteView.as_view())
]
