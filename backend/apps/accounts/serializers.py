from django.contrib.auth.models import Group
from rest_framework import serializers
from .models import User
from .role_permissions import get_permissions_for_role


# ── User serializers ───────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'department', 'is_active', 'last_login',
            'date_joined', 'permissions',
        ]
        read_only_fields = ['id', 'last_login', 'date_joined', 'permissions']

    def get_permissions(self, obj):
        return get_permissions_for_role(obj.role)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'role', 'phone', 'department', 'is_active',
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'department']
        read_only_fields = ['id', 'username', 'role']


class ResetPasswordSerializer(serializers.Serializer):
    new_password     = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError('Passwords do not match.')
        return data


# ── Group serializers ──────────────────────────────────────────────────────

class GroupMemberSerializer(serializers.ModelSerializer):
    """Lightweight user representation used inside a group's member list."""
    class Meta:
        model  = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'is_active']
        read_only_fields = fields


class GroupSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model  = Group
        fields = ['id', 'name', 'user_count']

    def get_user_count(self, obj):
        return obj.user_set.count()


class GroupDetailSerializer(serializers.ModelSerializer):
    members    = GroupMemberSerializer(source='user_set', many=True, read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model  = Group
        fields = ['id', 'name', 'user_count', 'members']

    def get_user_count(self, obj):
        return obj.user_set.count()


class AddMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        if not User.objects.filter(pk=value).exists():
            raise serializers.ValidationError('User not found.')
        return value
