from rest_framework import viewsets
from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related('case', 'uploaded_by')
    serializer_class = DocumentSerializer
    filterset_fields = ['case', 'doc_type']
    search_fields = ['title', 'notes']
