import api from './client'

export const authAPI = {
  login:  (username: string, password: string) => api.post('/auth/token/', { username, password }),
  logout: (refresh: string) => api.post('/auth/token/logout/', { refresh }),
  me:     () => api.get('/users/me/'),
}

export const casesAPI = {
  list:         (params?: Record<string, unknown>) => api.get('/cases/', { params }),
  create:       (data: Record<string, unknown>)    => api.post('/cases/', data),
  detail:       (id: number | string)              => api.get(`/cases/${id}/`),
  update:       (id: number | string, data: Record<string, unknown>) => api.patch(`/cases/${id}/`, data),
  close:        (id: number | string)              => api.post(`/cases/${id}/close/`),
  reopen:       (id: number | string)              => api.post(`/cases/${id}/reopen/`),
  updateStage:  (caseId: number | string, stageId: number | string, data: Record<string, unknown>) =>
    api.patch(`/cases/${caseId}/stages/${stageId}/`, data),
  addDecision:  (caseId: number | string, data: Record<string, unknown>) =>
    api.post(`/cases/${caseId}/decisions/`, data),
  addLitigation:(caseId: number | string, data: Record<string, unknown>) =>
    api.post(`/cases/${caseId}/litigation/`, data),
  listNotes:    (caseId: number | string) => api.get(`/cases/${caseId}/notes/`),
  addNote:      (caseId: number | string, data: { content: string; is_private?: boolean }) =>
    api.post(`/cases/${caseId}/notes/`, data),
  deleteNote:   (caseId: number | string, noteId: number | string) =>
    api.delete(`/cases/${caseId}/notes/${noteId}/`),
  submitResponse:(caseId: number | string, data: { content: string }) =>
    api.post(`/cases/${caseId}/responses/`, data),
  registerWithPortal: (caseId: number | string, data?: { form_type_code?: string }) =>
    api.post(`/cases/${caseId}/register-with-portal/`, data ?? {}),
  submitForApproval: (caseId: number | string) =>
    api.post(`/cases/${caseId}/submit-for-approval/`),
  approvePortal: (caseId: number | string, data?: { notes?: string }) =>
    api.post(`/cases/${caseId}/approve/`, data ?? {}),
  rejectPortal: (caseId: number | string, data: { notes: string }) =>
    api.post(`/cases/${caseId}/reject/`, data),
  signoff: (caseId: number | string, data: { outcome: string; notes?: string }) =>
    api.post(`/cases/${caseId}/signoff/`, data),
}

export const dashboardAPI = {
  stats: () => api.get('/dashboard/'),
}

export const documentsAPI = {
  list:   (params?: Record<string, unknown>) => api.get('/documents/', { params }),
  upload: (formData: FormData) =>
    api.post('/documents/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/documents/${id}/`),
}

export const notificationsAPI = {
  list:        () => api.get('/notifications/'),
  unreadCount: () => api.get('/notifications/unread_count/'),
  markRead:    (id: number) => api.patch(`/notifications/${id}/read/`),
  markAllRead: () => api.patch('/notifications/read_all/'),
}

export const auditAPI = {
  list: (params?: Record<string, unknown>) => api.get('/audit/', { params }),
}

/* ─── Users (full CRUD) ──────────────────────────────────────────────────── */
export const usersAPI = {
  list:          (params?: Record<string, unknown>) => api.get('/users/', { params }),
  detail:        (id: number | string)              => api.get(`/users/${id}/`),
  create:        (data: Record<string, unknown>)    => api.post('/users/', data),
  update:        (id: number | string, data: Record<string, unknown>) => api.patch(`/users/${id}/`, data),
  delete:        (id: number | string)              => api.delete(`/users/${id}/`),
  activate:      (id: number | string)              => api.post(`/users/${id}/activate/`),
  deactivate:    (id: number | string)              => api.post(`/users/${id}/deactivate/`),
  resetPassword: (id: number | string, data: { new_password: string; confirm_password: string }) =>
    api.post(`/users/${id}/reset_password/`, data),
}

/* ─── Groups ─────────────────────────────────────────────────────────────── */
export const groupsAPI = {
  list:         (params?: Record<string, unknown>) => api.get('/groups/', { params }),
  detail:       (id: number | string)              => api.get(`/groups/${id}/`),
  create:       (data: { name: string })           => api.post('/groups/', data),
  update:       (id: number | string, data: { name: string }) => api.patch(`/groups/${id}/`, data),
  delete:       (id: number | string)              => api.delete(`/groups/${id}/`),
  addMember:    (id: number | string, userId: number | string) =>
    api.post(`/groups/${id}/members/`, { user_id: userId }),
  removeMember: (id: number | string, userId: number | string) =>
    api.delete(`/groups/${id}/members/${userId}/`),
  members:      (id: number | string) => api.get(`/groups/${id}/members/`),
}

/* ─── Permissions (Django content-type permissions list) ─────────────────── */
export const permissionsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/permissions/', { params }),
}

/* ─── Workflow templates ─────────────────────────────────────────────────── */
export const workflowAPI = {
  list:         (params?: Record<string, unknown>) => api.get('/workflow-templates/', { params }),
  detail:       (id: number | string)              => api.get(`/workflow-templates/${id}/`),
  update:       (id: number | string, data: Record<string, unknown>) =>
    api.patch(`/workflow-templates/${id}/`, data),
  listStages:   (templateId: number | string) =>
    api.get(`/workflow-templates/${templateId}/stages/`),
  updateStage:  (templateId: number | string, stageId: number | string, data: Record<string, unknown>) =>
    api.patch(`/workflow-templates/${templateId}/stages/${stageId}/`, data),
}
