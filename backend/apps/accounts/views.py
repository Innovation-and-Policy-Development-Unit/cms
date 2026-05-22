from django.contrib.auth.models import Group
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import User
from .permissions import IsAdminRole
from .serializers import (
    UserSerializer, UserCreateSerializer, UserProfileSerializer,
    ResetPasswordSerializer,
    GroupSerializer, GroupDetailSerializer, AddMemberSerializer,
)


# ── Users ──────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset       = User.objects.all().order_by('first_name', 'last_name')
    search_fields  = ['username', 'first_name', 'last_name', 'email']
    filterset_fields = ['role', 'is_active']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'me'):
            return [IsAuthenticated()]
        return [IsAdminRole()]

    # ── /users/me ──────────────────────────────────────────────────────────
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.method == 'PATCH':
            serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(UserSerializer(request.user).data)

    # ── /users/{id}/activate ───────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'detail': f'{user.get_full_name()} activated.'})

    # ── /users/{id}/deactivate ─────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({'detail': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'detail': f'{user.get_full_name()} deactivated.'})

    # ── /users/{id}/reset_password ─────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole], url_path='reset_password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully.'})


# ── Groups ─────────────────────────────────────────────────────────────────

class GroupViewSet(viewsets.ModelViewSet):
    queryset      = Group.objects.all().order_by('name')
    search_fields = ['name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GroupDetailSerializer
        return GroupSerializer

    def get_permissions(self):
        return [IsAdminRole()]

    # ── /groups/{id}/members ───────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        group = self.get_object()
        from .serializers import GroupMemberSerializer
        serializer = GroupMemberSerializer(group.user_set.all().order_by('first_name'), many=True)
        return Response(serializer.data)

    # ── POST /groups/{id}/members   → add a user ───────────────────────────
    @members.mapping.post
    def add_member(self, request, pk=None):
        group = self.get_object()
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(pk=serializer.validated_data['user_id'])
        group.user_set.add(user)
        return Response({'detail': f'{user.get_full_name()} added to {group.name}.'}, status=status.HTTP_201_CREATED)

    # ── DELETE /groups/{id}/members/{user_id} → remove a user ─────────────
    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[0-9]+)')
    def remove_member(self, request, pk=None, user_id=None):
        group = self.get_object()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        group.user_set.remove(user)
        return Response({'detail': f'{user.get_full_name()} removed from {group.name}.'})
