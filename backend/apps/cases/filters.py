import django_filters

from .models import Case


class CaseFilter(django_filters.FilterSet):
    subject_ministry = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = Case
        fields = [
            'status',
            'case_family',
            'is_senior_executive',
            'portal_approval_status',
            'subject_ministry',
        ]
