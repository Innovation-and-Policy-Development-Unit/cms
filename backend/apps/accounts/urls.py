from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, GroupViewSet

router = DefaultRouter()
router.register('users',  UserViewSet,  basename='user')
router.register('groups', GroupViewSet, basename='group')

urlpatterns = [path('', include(router.urls))]
