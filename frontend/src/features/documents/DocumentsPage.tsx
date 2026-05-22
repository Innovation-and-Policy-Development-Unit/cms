import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, FileText, Search, Eye, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { documentsAPI } from '@/api/ccms'
import { usePermissions } from '@/hooks/use-permissions'
import { DocumentUploadDialog, DOCUMENT_TYPES } from '@/components/documents/DocumentUploadDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label]),
)

export default function DocumentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const p = usePermissions()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [q, setQ] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsAPI.list().then((r) => r.data),
  })

  const allDocs: Record<string, unknown>[] = data?.results ?? data ?? []

  const hasFilters = Boolean(q || docTypeFilter)

  const docs = allDocs.filter((d) => {
    const matchQ =
      !q ||
      `${d.title} ${d.case} ${d.uploaded_by_name}`.toLowerCase().includes(q.toLowerCase())
    const matchType = !docTypeFilter || d.doc_type === docTypeFilter
    return matchQ && matchType
  })

  const handleDeleteConfirm = async () => {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await documentsAPI.delete(deleteId)
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted.')
      setDeleteId(null)
    } catch {
      toast.error('Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  const openCase = (caseId: unknown) => {
    if (caseId) navigate({ to: '/cases/$id', params: { id: String(caseId) }, search: { tab: 'documents' } })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Cross-case document registry — every file is stored against a case record.
          </p>
        </div>
        {p.canUploadDocs && (
          <Button onClick={() => setUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload document
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, case id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select
          value={docTypeFilter || '__all__'}
          onValueChange={(v) => setDocTypeFilter(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {DOCUMENT_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : docs.length === 0 ? (
                <TableEmptyState
                  colSpan={6}
                  icon={FileText}
                  title={hasFilters ? 'No documents match your filters' : 'No documents yet'}
                  description={
                    hasFilters
                      ? 'Try a different search or document type.'
                      : 'Upload a file from a case or attach one here with a case selected.'
                  }
                >
                  {hasFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQ('')
                        setDocTypeFilter('')
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear filters
                    </Button>
                  )}
                  {p.canUploadDocs && (
                    <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Upload document
                    </Button>
                  )}
                </TableEmptyState>
              ) : (
                docs.map((d) => (
                  <TableRow key={d.id as number}>
                    <TableCell className="font-medium">{d.title as string}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 font-mono text-xs"
                        onClick={() => openCase(d.case)}
                      >
                        Case #{String(d.case)}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {DOC_TYPE_LABEL[d.doc_type as string] ??
                          (d.doc_type as string)?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{(d.uploaded_by_name as string) ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {(d.uploaded_at as string)?.split('T')[0]}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {d.file_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={d.file_url as string} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {p.canDeleteDocs && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(d.id as number)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete document?"
        description="The file will be removed from the case record. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
