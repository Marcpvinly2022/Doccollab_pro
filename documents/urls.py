from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create/', views.create_document, name='create_document'),
    path('editor/<int:document_id>/', views.editor, name='editor'),
    path('api/share/<int:document_id>/', views.share_document, name='share_document'),
    path('api/toggle-public/<int:document_id>/', views.toggle_public, name='toggle_public'),
    path('api/delete/<int:document_id>/', views.delete_document, name='delete_document'),
    path('api/save-version/<int:document_id>/', views.save_version, name='save_version'),
    path('api/versions/<int:document_id>/', views.get_versions, name='get_versions'),
    path('api/restore/<int:document_id>/<int:version_id>/', views.restore_version, name='restore_version'),
    path('api/download/<int:document_id>/', views.download_document, name='download_document'),
]
