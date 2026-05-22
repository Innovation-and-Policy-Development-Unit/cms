from rest_framework import serializers

from .models import FormTemplate, SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    access_token_lifetime = serializers.CharField(read_only=True, default='8 hours')
    refresh_token_lifetime = serializers.CharField(read_only=True, default='7 days')
    read_only_fields_note = serializers.CharField(
        read_only=True,
        default='JWT lifetimes are configured in Django settings (SIMPLE_JWT).',
    )

    class Meta:
        model = SystemSettings
        fields = [
            'organisation_name', 'system_code', 'sop_reference', 'timezone_display',
            'sla_at_risk_days', 'sla_critical_days',
            'system_email', 'admin_notification_email',
            'access_token_lifetime', 'refresh_token_lifetime',
            'read_only_fields_note', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class FormTemplateSerializer(serializers.ModelSerializer):
    has_file = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = FormTemplate
        fields = [
            'id', 'category', 'name', 'code', 'description',
            'has_file', 'download_url', 'sort_order', 'is_active',
        ]

    def get_has_file(self, obj):
        return bool(obj.file)

    def get_download_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url
