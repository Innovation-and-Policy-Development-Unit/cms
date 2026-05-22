import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formTemplatesAPI } from '@/api/ccms'
import { AdminReferenceBanner } from '@/components/admin/AdminReferenceBanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface FormTemplate {
  id: number
  category: string
  name: string
  code: string
  description: string
  has_file: boolean
  download_url: string | null
}

export default function FormsTemplatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['form-templates'],
    queryFn: () =>
      formTemplatesAPI.list().then((r) => {
        const rows = (r.data?.results ?? r.data ?? []) as FormTemplate[]
        return rows
      }),
  })

  const byCategory = useMemo(() => {
    const map = new Map<string, FormTemplate[]>()
    for (const tpl of data ?? []) {
      const list = map.get(tpl.category) ?? []
      list.push(tpl)
      map.set(tpl.category, list)
    }
    return [...map.entries()]
  }, [data])

  const handleDownload = async (tpl: FormTemplate) => {
    if (!tpl.has_file) {
      toast.info('Reference catalog only — no file attached for this template yet.')
      return
    }
    try {
      const { data: blob } = await formTemplatesAPI.download(tpl.code)
      const url = URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tpl.code}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed or file not available.')
    }
  }

  const handlePreview = (tpl: FormTemplate) => {
    if (tpl.download_url) {
      window.open(tpl.download_url, '_blank', 'noopener,noreferrer')
    } else {
      toast.info('Preview requires an uploaded template file (admin: attach via Django admin).')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forms & Templates</h1>
        <p className="text-sm text-muted-foreground">
          Official letters and forms catalog
        </p>
      </div>

      <AdminReferenceBanner title="Template catalog">
        Templates are stored in the database. Download and preview work when a file has been
        uploaded (Django admin → Form templates). Until then, entries are reference metadata only.
      </AdminReferenceBanner>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {byCategory.map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((tpl) => (
                  <Card key={tpl.code} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <CardTitle className="text-sm font-semibold leading-tight">{tpl.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className="shrink-0 font-mono text-xs">
                          {tpl.code}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 text-xs">{tpl.description}</CardDescription>
                      {!tpl.has_file && (
                        <Badge variant="secondary" className="mt-2 w-fit text-[10px]">
                          Reference only
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 mt-auto">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handleDownload(tpl)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handlePreview(tpl)}
                          disabled={!tpl.has_file}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
