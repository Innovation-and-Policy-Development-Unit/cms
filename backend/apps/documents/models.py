from django.db import models
from apps.accounts.models import User
from apps.cases.models import Case


def case_document_path(instance, filename):
    return f'cases/{instance.case.id}/documents/{filename}'


class Document(models.Model):
    class DocType(models.TextChoices):
        ALLEGATION_LETTER = 'allegation_letter', 'Allegation Letter'
        RESPONSE_LETTER = 'response_letter', 'Response Letter'
        INVESTIGATION_REPORT = 'investigation_report', 'Investigation Report'
        DECISION_LETTER = 'decision_letter', 'Decision Letter'
        EVIDENCE = 'evidence', 'Evidence'
        COURT_FILING = 'court_filing', 'Court Filing'
        OTHER = 'other', 'Other'

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    doc_type = models.CharField(max_length=30, choices=DocType.choices, default=DocType.OTHER)
    file = models.FileField(upload_to=case_document_path)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.title} — {self.case.reference_number}'

    def save(self, *args, **kwargs):
        if self.file and hasattr(self.file, 'size'):
            self.file_size = self.file.size
        super().save(*args, **kwargs)
