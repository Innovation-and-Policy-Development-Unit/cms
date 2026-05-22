import { FileText, Download, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const TEMPLATES = [
  {
    category: 'Disciplinary',
    items: [
      { name: 'Notice of Allegation', code: 'IPDU-F-001', description: 'Initial notice sent to subject outlining the allegation.' },
      { name: 'Show Cause Notice', code: 'IPDU-F-002', description: 'Formal request for the subject to show cause.' },
      { name: 'Investigation Report Template', code: 'IPDU-F-003', description: 'Structured report for investigating officers.' },
      { name: 'Disciplinary Committee Recommendation', code: 'IPDU-F-004', description: 'Formal committee outcome and recommendation.' },
    ],
  },
  {
    category: 'Grievance',
    items: [
      { name: 'Grievance Lodgment Form', code: 'IPDU-F-010', description: 'Form completed by the aggrieved party.' },
      { name: 'Grievance Outcome Letter', code: 'IPDU-F-011', description: 'Formal outcome communication to parties.' },
    ],
  },
  {
    category: 'Senior Executive',
    items: [
      { name: 'Senior Executive Notice of Suspension', code: 'IPDU-F-020', description: 'Temporary suspension notice for DG/Director level.' },
      { name: 'Commission Referral Letter', code: 'IPDU-F-021', description: 'Referral to the Public Service Commission.' },
    ],
  },
  {
    category: 'General',
    items: [
      { name: 'Acknowledgement of Receipt', code: 'IPDU-F-030', description: 'Confirmation letter to the complainant.' },
      { name: 'Extension of Time Request', code: 'IPDU-F-031', description: 'Request for statutory deadline extension.' },
      { name: 'Case Closure Notification', code: 'IPDU-F-032', description: 'Formal closure communicated to all parties.' },
    ],
  },
]

export default function FormsTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forms & Templates</h1>
        <p className="text-sm text-muted-foreground">Official IPDU letters, forms, and document templates — IPDU-SOP-001</p>
      </div>

      <div className="space-y-6">
        {TEMPLATES.map((section) => (
          <div key={section.category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {section.category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.items.map((tpl) => (
                <Card key={tpl.code} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <CardTitle className="text-sm font-semibold leading-tight">{tpl.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">{tpl.code}</Badge>
                    </div>
                    <CardDescription className="mt-1 text-xs">{tpl.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled>
                        <ExternalLink className="h-3.5 w-3.5" /> Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
