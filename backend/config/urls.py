from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView

urlpatterns = [
    path('api/v1/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/token/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('api/v1/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.cases.urls')),
    path('api/v1/', include('apps.documents.urls')),
    path('api/v1/', include('apps.audit.urls')),
    path('api/v1/', include('apps.notifications.urls')),
    path('api/v1/', include('apps.system.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
