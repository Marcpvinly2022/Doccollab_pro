from django.contrib import admin
from .models import Document, DocumentPermission, DocumentVersion, DocumentComment, UserPresence, DocumentActivity

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'created_at', 'updated_at', 'is_public')
    list_filter = ('created_at', 'is_public')
    search_fields = ('title', 'owner__username')

@admin.register(DocumentPermission)
class DocumentPermissionAdmin(admin.ModelAdmin):
    list_display = ('document', 'user', 'permission', 'created_at')
    list_filter = ('permission', 'created_at')

@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ('document', 'version_number', 'created_by', 'created_at')
    list_filter = ('created_at',)

@admin.register(DocumentComment)
class DocumentCommentAdmin(admin.ModelAdmin):
    list_display = ('document', 'user', 'position', 'created_at', 'resolved')
    list_filter = ('resolved', 'created_at')

@admin.register(UserPresence)
class UserPresenceAdmin(admin.ModelAdmin):
    list_display = ('document', 'user', 'cursor_position', 'last_seen')

@admin.register(DocumentActivity)
class DocumentActivityAdmin(admin.ModelAdmin):
    list_display = ('document', 'user', 'activity_type', 'created_at')
    list_filter = ('activity_type', 'created_at')
