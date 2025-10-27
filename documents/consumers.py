
"""
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Document, UserPresence, DocumentActivity, DocumentVersion
from django.contrib.auth.models import User
from django.utils import timezone

class DocumentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.document_id = self.scope['url_route']['kwargs']['document_id']
        self.user = self.scope['user']
        self.room_group_name = f'document_{self.document_id}'
        
        # Check permissions
        has_permission = await self.check_permission()
        if not has_permission:
            await self.close()
            return
        
        # Add to channel group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Add user presence
        await self.add_user_presence()
        await self.accept()
        
        # Notify others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'username': self.user.username,
                'user_id': self.user.id,
            }
        )
        
        # Send document content to new user
        document = await self.get_document()
        active_users = await self.get_active_users()
        
        await self.send(text_data=json.dumps({
            'type': 'document_load',
            'content': document.content,
            'title': document.title,
            'active_users': active_users,
        }))
        
        # Log activity
        await self.log_activity('join', f'{self.user.username} joined the document')

    async def disconnect(self, close_code):
        await self.remove_user_presence()
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'username': self.user.username,
                'user_id': self.user.id,
            }
        )
        
        await self.log_activity('leave', f'{self.user.username} left the document')

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'edit':
                # Broadcast edit to all users
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'document_edit',
                        'content': data.get('content'),
                        'username': self.user.username,
                        'user_id': self.user.id,
                    }
                )
                # Save to database
                await self.save_document(data.get('content'))
                await self.log_activity('edit', f'{self.user.username} edited the document')
            
            elif message_type == 'cursor':
                # Broadcast cursor position
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'cursor_update',
                        'username': self.user.username,
                        'user_id': self.user.id,
                        'position': data.get('position'),
                        'selection_start': data.get('selection_start', 0),
                        'selection_end': data.get('selection_end', 0),
                    }
                )
                await self.update_cursor_position(
                    data.get('position'),
                    data.get('selection_start', 0),
                    data.get('selection_end', 0)
                )
            
            elif message_type == 'comment':
                # Save comment
                await self.save_comment(data.get('content'), data.get('position'))
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'comment_added',
                        'username': self.user.username,
                        'user_id': self.user.id,
                        'content': data.get('content'),
                        'position': data.get('position'),
                    }
                )
                await self.log_activity('comment', f'{self.user.username} added a comment')
        
        except Exception as e:
            print(f"[v0] Error in receive: {str(e)}")

    async def document_edit(self, event):
        await self.send(text_data=json.dumps({
            'type': 'edit',
            'content': event['content'],
            'username': event['username'],
            'user_id': event['user_id'],
        }))

    async def cursor_update(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'cursor',
                'username': event['username'],
                'user_id': event['user_id'],
                'position': event['position'],
                'selection_start': event.get('selection_start', 0),
                'selection_end': event.get('selection_end', 0),
            }))

    async def user_joined(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'username': event['username'],
                'user_id': event['user_id'],
            }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'username': event['username'],
            'user_id': event['user_id'],
        }))

    async def comment_added(self, event):
        await self.send(text_data=json.dumps({
            'type': 'comment',
            'username': event['username'],
            'user_id': event['user_id'],
            'content': event['content'],
            'position': event['position'],
        }))

    @database_sync_to_async
    def check_permission(self):
        try:
            document = Document.objects.get(id=self.document_id)
            if document.owner == self.user:
                return True
            if document.is_public:
                return True
            return document.permissions.filter(user=self.user).exists()
        except Document.DoesNotExist:
            return False

    @database_sync_to_async
    def get_document(self):
        return Document.objects.get(id=self.document_id)

    @database_sync_to_async
    def get_active_users(self):
        users = UserPresence.objects.filter(document_id=self.document_id).select_related('user')
        return [
            {
                'id': u.user.id,
                'username': u.user.username,
                'cursor_position': u.cursor_position,
                'color': u.color,
            }
            for u in users
        ]

    @database_sync_to_async
    def save_document(self, content):
        document = Document.objects.get(id=self.document_id)
        document.content = content
        document.save()

    @database_sync_to_async
    def add_user_presence(self):
        UserPresence.objects.update_or_create(
            document_id=self.document_id,
            user=self.user,
            defaults={'cursor_position': 0}
        )

    @database_sync_to_async
    def remove_user_presence(self):
        UserPresence.objects.filter(
            document_id=self.document_id,
            user=self.user
        ).delete()

    @database_sync_to_async
    def update_cursor_position(self, position, selection_start, selection_end):
        UserPresence.objects.filter(
            document_id=self.document_id,
            user=self.user
        ).update(
            cursor_position=position,
            selection_start=selection_start,
            selection_end=selection_end,
            last_seen=timezone.now()
        )

    @database_sync_to_async
    def save_comment(self, content, position):
        from .models import DocumentComment
        DocumentComment.objects.create(
            document_id=self.document_id,
            user=self.user,
            content=content,
            position=position
        )

    @database_sync_to_async
    def log_activity(self, activity_type, description):
        DocumentActivity.objects.create(
            document_id=self.document_id,
            user=self.user,
            activity_type=activity_type,
            description=description
        )
        
        
"""




import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Document, UserPresence, DocumentActivity, DocumentVersion, DocumentPermission
from django.contrib.auth.models import User
from django.utils import timezone



# documents/consumers.py
# <- add this new Yjs relay consumer to the bottom of your file (or near your other consumers)
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class YjsRelayConsumer(AsyncWebsocketConsumer):
    """
    Minimal relay for Yjs binary/text updates.
    Keeps messages as-is and broadcasts to the document group.
    Use a separate route (e.g. /ws/yjs/<id>/) so your existing DocumentConsumer is unaffected.
    """

    async def connect(self):
        self.document_id = self.scope['url_route']['kwargs']['document_id']
        self.group_name = f'yjs_doc_{self.document_id}'

        # Reject anonymous users
        user = self.scope.get("user")
        if user is None or user.is_anonymous:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"YjsRelayConsumer: {user} connected to Yjs room {self.document_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"YjsRelayConsumer: disconnected from Yjs room {self.document_id} (code {close_code})")

    async def receive(self, text_data=None, bytes_data=None):
        """
        Relay incoming frame (text or binary) to the group unchanged.
        Yjs client may send binary updates (bytes_data) or JSON text for awareness.
        """
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "yjs.relay",
                "text_data": text_data,
                "bytes_data": bytes_data,
            }
        )

    async def yjs_relay(self, event):
        # Send the frame unchanged to the WS client (binary if present, else text)
        if event.get("bytes_data") is not None:
            await self.send(bytes_data=event["bytes_data"])
        elif event.get("text_data") is not None:
            await self.send(text_data=event["text_data"])








class DocumentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(f"[v1] WebSocket connection attempt - User: {self.scope['user']}, Document: {self.scope['url_route']['kwargs']['document_id']}")
        
        self.document_id = self.scope['url_route']['kwargs']['document_id']
        self.user = self.scope['user']
        self.room_group_name = f'document_{self.document_id}'
        
        # Reject if user is anonymous (not authenticated)
        if self.user.is_anonymous:
            print("[v1] Rejecting connection: Anonymous user")
            await self.close()
            return
        
        # Check permissions with better error handling
        has_permission = await self.check_permission()
        if not has_permission:
            print(f"[v1] Rejecting connection: User {self.user.username} has no permission for document {self.document_id}")
            await self.close()
            return
        
        try:
            # Add to channel group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Add user presence
            await self.add_user_presence()
            await self.accept()
            
            print(f"[v1] WebSocket connected: User {self.user.username} to document {self.document_id}")
            
            # Notify others about new user (excluding self)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'username': self.user.username,
                    'user_id': self.user.id,
                }
            )
            
            # Send document content to new user
            document = await self.get_document()
            active_users = await self.get_active_users()
            
            await self.send(text_data=json.dumps({
                'type': 'document_load',
                'content': document.content,
                'title': document.title,
                'active_users': active_users,
            }))
            
            # Log activity
            await self.log_activity('join', f'{self.user.username} joined the document')
            
        except Exception as e:
            print(f"[v1] Error in connect: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        print(f"[v1] WebSocket disconnecting: User {self.user.username}, Code: {close_code}")
        
        try:
            await self.remove_user_presence()
            
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
                
                # Notify others about user leaving (excluding self)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'username': self.user.username,
                        'user_id': self.user.id,
                    }
                )
                
            await self.log_activity('leave', f'{self.user.username} left the document')
            
        except Exception as e:
            print(f"[v1] Error in disconnect: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            print(f"[v1] Received message type: {message_type} from user {self.user.username}")
            
            if message_type == 'edit':
                content = data.get('content', '')
                
                # Validate content
                if content is None:
                    return
                
                # Save to database first
                await self.save_document(content)
                
                # Then broadcast to all users (including sender for sync)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'document_edit',
                        'content': content,
                        'username': self.user.username,
                        'user_id': self.user.id,
                        'timestamp': timezone.now().isoformat(),
                    }
                )
                
                await self.log_activity('edit', f'{self.user.username} edited the document')
            
            elif message_type == 'cursor':
                # Broadcast cursor position to other users only
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'cursor_update',
                        'username': self.user.username,
                        'user_id': self.user.id,
                        'position': data.get('position', 0),
                        'selection_start': data.get('selection_start', 0),
                        'selection_end': data.get('selection_end', 0),
                    }
                )
                
                await self.update_cursor_position(
                    data.get('position', 0),
                    data.get('selection_start', 0),
                    data.get('selection_end', 0)
                )
            
            elif message_type == 'comment':
                comment_content = data.get('content', '').strip()
                position = data.get('position', 0)
                
                if comment_content:
                    # Save comment
                    await self.save_comment(comment_content, position)
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'comment_added',
                            'username': self.user.username,
                            'user_id': self.user.id,
                            'content': comment_content,
                            'position': position,
                        }
                    )
                    await self.log_activity('comment', f'{self.user.username} added a comment')
        
        except json.JSONDecodeError as e:
            print(f"[v1] JSON decode error: {str(e)}")
        except Exception as e:
            print(f"[v1] Error in receive: {str(e)}")

    # Handler for document edits - sends to ALL users including sender
    async def document_edit(self, event):
        await self.send(text_data=json.dumps({
            'type': 'edit',
            'content': event['content'],
            'username': event['username'],
            'user_id': event['user_id'],
            'timestamp': event.get('timestamp'),
        }))

    # Handler for cursor updates - sends to OTHER users only
    async def cursor_update(self, event):
        # Only send cursor updates from other users
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'cursor',
                'username': event['username'],
                'user_id': event['user_id'],
                'position': event['position'],
                'selection_start': event.get('selection_start', 0),
                'selection_end': event.get('selection_end', 0),
            }))

    # Handler for user joined - sends to OTHER users only
    async def user_joined(self, event):
        # Only notify about other users joining
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'username': event['username'],
                'user_id': event['user_id'],
            }))

    # Handler for user left - sends to ALL remaining users
    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'username': event['username'],
            'user_id': event['user_id'],
        }))

    # Handler for comments - sends to ALL users
    async def comment_added(self, event):
        await self.send(text_data=json.dumps({
            'type': 'comment',
            'username': event['username'],
            'user_id': event['user_id'],
            'content': event['content'],
            'position': event['position'],
        }))

    @database_sync_to_async
    def check_permission(self):
        """Check if user has permission to access this document"""
        try:
            document = Document.objects.get(id=self.document_id)
            
            # User is owner
            if document.owner == self.user:
                return True
                
            # Document is public
            if document.is_public:
                return True
                
            # User has explicit permission
            if DocumentPermission.objects.filter(document=document, user=self.user).exists():
                return True
                
            print(f"[v1] Permission denied: User {self.user.username} for document {self.document_id}")
            return False
            
        except Document.DoesNotExist:
            print(f"[v1] Document {self.document_id} not found")
            return False
        except Exception as e:
            print(f"[v1] Error in check_permission: {str(e)}")
            return False

    @database_sync_to_async
    def get_document(self):
        return Document.objects.get(id=self.document_id)

    @database_sync_to_async
    def get_active_users(self):
        """Get currently active users in the document"""
        try:
            users = UserPresence.objects.filter(
                document_id=self.document_id
            ).select_related('user')
            
            return [
                {
                    'id': presence.user.id,
                    'username': presence.user.username,
                    'cursor_position': presence.cursor_position,
                    'color': getattr(presence, 'color', f'hsl({presence.user.id * 60 % 360}, 70%, 60%)'),
                    'last_seen': presence.last_seen.isoformat() if presence.last_seen else None,
                }
                for presence in users
            ]
        except Exception as e:
            print(f"[v1] Error in get_active_users: {str(e)}")
            return []

    @database_sync_to_async
    def save_document(self, content):
        """Save document content and create version history"""
        try:
            document = Document.objects.get(id=self.document_id)
            old_content = document.content
            
            # Only save if content actually changed
            if old_content != content:
                document.content = content
                document.modified_at = timezone.now()
                document.last_modified_by = self.user
                document.save()
                
                # Create version history
                DocumentVersion.objects.create(
                    document=document,
                    content=old_content,
                    created_by=self.user,
                    version_number=(DocumentVersion.objects.filter(document=document).count() + 1)
                )
                
                print(f"[v1] Document {self.document_id} saved by {self.user.username}")
                
        except Exception as e:
            print(f"[v1] Error saving document: {str(e)}")

    @database_sync_to_async
    def add_user_presence(self):
        """Add or update user presence"""
        try:
            UserPresence.objects.update_or_create(
                document_id=self.document_id,
                user=self.user,
                defaults={
                    'cursor_position': 0,
                    'last_seen': timezone.now(),
                    'is_online': True
                }
            )
            print(f"[v1] User presence added: {self.user.username} for document {self.document_id}")
        except Exception as e:
            print(f"[v1] Error adding user presence: {str(e)}")

    @database_sync_to_async
    def remove_user_presence(self):
        """Remove user presence"""
        try:
            deleted_count, _ = UserPresence.objects.filter(
                document_id=self.document_id,
                user=self.user
            ).delete()
            print(f"[v1] User presence removed: {self.user.username} for document {self.document_id} (deleted: {deleted_count})")
        except Exception as e:
            print(f"[v1] Error removing user presence: {str(e)}")

    @database_sync_to_async
    def update_cursor_position(self, position, selection_start, selection_end):
        """Update user's cursor position"""
        try:
            UserPresence.objects.filter(
                document_id=self.document_id,
                user=self.user
            ).update(
                cursor_position=position,
                selection_start=selection_start,
                selection_end=selection_end,
                last_seen=timezone.now()
            )
        except Exception as e:
            print(f"[v1] Error updating cursor: {str(e)}")

    @database_sync_to_async
    def save_comment(self, content, position):
        """Save document comment"""
        from .models import DocumentComment
        try:
            DocumentComment.objects.create(
                document_id=self.document_id,
                user=self.user,
                content=content,
                position=position
            )
            print(f"[v1] Comment saved by {self.user.username}")
        except Exception as e:
            print(f"[v1] Error saving comment: {str(e)}")

    @database_sync_to_async
    def log_activity(self, activity_type, description):
        """Log document activity"""
        try:
            DocumentActivity.objects.create(
                document_id=self.document_id,
                user=self.user,
                activity_type=activity_type,
                description=description
            )
        except Exception as e:
            print(f"[v1] Error logging activity: {str(e)}")