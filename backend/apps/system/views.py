from django.http import FileResponse, Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole

from .models import FormTemplate, SystemSettings
from .serializers import FormTemplateSerializer, SystemSettingsSerializer
from .workflow_registry import build_workflow_payload, list_all_workflows


class SystemSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def get(self, request):
        settings_obj = SystemSettings.load()
        return Response(SystemSettingsSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj = SystemSettings.load()
        serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FormTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Reference catalog of IPDU forms; download only when a file is attached."""

    serializer_class = FormTemplateSerializer
    permission_classes = [IsAuthenticated]
    queryset = FormTemplate.objects.filter(is_active=True)
    lookup_field = 'code'

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, code=None):
        template = self.get_object()
        if not template.file:
            return Response(
                {
                    'detail': (
                        'No file is attached to this template. '
                        'It is listed as a reference catalog entry only.'
                    ),
                    'reference_only': True,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(
            template.file.open('rb'),
            as_attachment=True,
            filename=template.file.name.split('/')[-1],
        )


class WorkflowTemplateViewSet(viewsets.ViewSet):
    """
    Read-only statutory workflow definitions (source: apps.cases.workflow).
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(list_all_workflows())

    def retrieve(self, request, pk=None):
        payload = build_workflow_payload(pk)
        if not payload:
            return Response({'detail': 'Unknown workflow family.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(payload)
