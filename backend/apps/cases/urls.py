from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CaseViewSet, DashboardStatsView

router = DefaultRouter()
router.register('cases', CaseViewSet, basename='case')
router.register('dashboard', DashboardStatsView, basename='dashboard')

urlpatterns = [path('', include(router.urls))]
