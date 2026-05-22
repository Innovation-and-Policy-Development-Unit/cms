"""Serializers for SCDMS integration (pull API)."""

from rest_framework import serializers

from .portal_integration import build_scdms_export_payload
from .models import Case


class ScdmsCaseExportSerializer(serializers.ModelSerializer):
    """Read-only export shape for SCDMS pull queue."""

    export = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id',
            'reference_number',
            'portal_approval_status',
            'portal_form_type_code',
            'cdp_submission_id',
            'portal_sent_at',
            'export',
        ]

    def get_export(self, obj: Case) -> dict:
        return build_scdms_export_payload(obj)
