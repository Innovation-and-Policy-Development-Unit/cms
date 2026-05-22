from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FormTemplateViewSet, SystemSettingsView, WorkflowTemplateViewSet

router = DefaultRouter()
router.register('form-templates', FormTemplateViewSet, basename='form-template')
router.register('workflow-templates', WorkflowTemplateViewSet, basename='workflow-template')

urlpatterns = [
    path('system-settings/', SystemSettingsView.as_view(), name='system-settings'),
    *router.urls,
]
