# DocCollab - Real-time Document Collaboration System

A production-ready Django-based real-time collaborative document editing system with advanced features like Tiptap editor, version history, real-time cursor tracking, and document sharing.

## Features

- **Real-time Collaborative Editing**: Multiple users can edit the same document simultaneously with instant synchronization
- **Advanced Editor**: Tiptap-based editor with rich formatting options (bold, italic, underline, lists, links, etc.)
- **Real-time Cursor Tracking**: See exactly where other users are typing
- **Activity Tracking**: Real-time activity log showing who's online and what they're doing
- **Document Sharing**: Share documents with role-based permissions (Owner, Editor, Viewer)
- **Version History**: Track all changes and restore previous versions
- **Comments System**: Add comments to specific positions in the document
- **Auto-save**: Automatic saving every 30 seconds
- **Manual Save**: Explicit save button for version snapshots
- **Download Options**: Export documents as TXT, DOCX, or PDF
- **User Presence**: See active users in real-time
- **WebSocket-based**: Low-latency real-time communication

## Tech Stack

- **Backend**: Django 4.2, Django Channels, Django REST Framework
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Real-time**: WebSockets, Redis, Channels
- **Database**: SQLite (development), PostgreSQL (production)
- **Editor**: Tiptap (ProseMirror-based)
- **Export**: python-docx, reportlab

## Installation

### Prerequisites

- Python 3.8+
- Redis server
- pip

### Setup

1. **Clone/Download the project**
   \`\`\`bash
   cd doccollab
   \`\`\`

2. **Create virtual environment**
   \`\`\`bash
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   \`\`\`

3. **Install dependencies**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

4. **Run migrations**
   \`\`\`bash
   python manage.py makemigrations
   python manage.py migrate
   \`\`\`

5. **Create superuser**
   \`\`\`bash
   python manage.py createsuperuser
   \`\`\`

6. **Start Redis** (in a separate terminal)
   \`\`\`bash
   redis-server
   \`\`\`
   
   Or on WSL Ubuntu:
   \`\`\`bash
   wsl
   redis-server
   \`\`\`

7. **Start Django server** (in another terminal)
   \`\`\`bash
   daphne -b 0.0.0.0 -p 8000 doccollab.asgi:application
   \`\`\`

8. **Open browser**
   \`\`\`
   http://localhost:8000
   \`\`\`

## Usage

1. Register or login
2. Create a new document
3. Start editing in real-time
4. Share documents with other users
5. See real-time cursor positions and activity
6. Save versions and download documents

## API Endpoints

- `POST /documents/register/` - Register new user
- `POST /documents/login/` - Login user
- `POST /documents/logout/` - Logout user
- `GET /documents/dashboard/` - View all documents
- `POST /documents/create/` - Create new document
- `GET /documents/editor/<id>/` - Open document editor
- `POST /documents/api/share/<id>/` - Share document
- `POST /documents/api/toggle-public/<id>/` - Toggle public access
- `DELETE /documents/api/delete/<id>/` - Delete document
- `POST /documents/api/save-version/<id>/` - Save version
- `GET /documents/api/versions/<id>/` - Get version history
- `POST /documents/api/restore/<id>/<version_id>/` - Restore version
- `GET /documents/api/download/<id>/` - Download document

## WebSocket Events

- `edit` - Document content changed
- `cursor` - User cursor position updated
- `comment` - Comment added
- `user_joined` - User joined document
- `user_left` - User left document

## Troubleshooting

- **WebSocket connection fails**: Ensure Redis is running
- **Port 8000 in use**: Use different port: `daphne -b 0.0.0.0 -p 8001 doccollab.asgi:application`
- **Database errors**: Run `python manage.py migrate`
- **Static files not loading**: Run `python manage.py collectstatic`

## Production Deployment

For production:
1. Change `DEBUG=False` in `.env`
2. Use PostgreSQL instead of SQLite
3. Use a production ASGI server (Gunicorn + Daphne)
4. Set up proper Redis configuration
5. Configure ALLOWED_HOSTS
6. Use HTTPS
7. Set strong SECRET_KEY

## License

MIT
