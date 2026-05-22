from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'resource_type', 'resource_id', 'description', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'
