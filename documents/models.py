from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json

class Document(models.Model):
    title = models.CharField(max_length=255, default='Untitled Document')
    content = models.JSONField(default=dict)  # Stores Tiptap JSON content
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_documents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.title

class DocumentPermission(models.Model):
    PERMISSION_CHOICES = [
        ('owner', 'Owner'),
        ('editor', 'Editor'),
        ('viewer', 'Viewer'),
    ]
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='permissions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('document', 'user')
    
    def __str__(self):
        return f"{self.user.username} - {self.document.title} ({self.permission})"

class DocumentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    content = models.JSONField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    version_number = models.IntegerField()
    change_summary = models.CharField(max_length=255, blank=True)
    
    class Meta:
        ordering = ['-version_number']
    
    def __str__(self):
        return f"{self.document.title} - v{self.version_number}"

class DocumentComment(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    position = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.document.title}"

class UserPresence(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='active_users')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    cursor_position = models.IntegerField(default=0)
    selection_start = models.IntegerField(default=0)
    selection_end = models.IntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # User's cursor color
    
    class Meta:
        unique_together = ('document', 'user')
    
    def __str__(self):
        return f"{self.user.username} in {self.document.title}"

class DocumentActivity(models.Model):
    ACTIVITY_TYPES = [
        ('edit', 'Edit'),
        ('comment', 'Comment'),
        ('share', 'Share'),
        ('join', 'Join'),
        ('leave', 'Leave'),
    ]
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.activity_type} on {self.document.title}"
