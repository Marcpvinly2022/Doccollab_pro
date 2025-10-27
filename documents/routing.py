from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/document/(?P<document_id>\w+)/$', consumers.DocumentConsumer.as_asgi()),
    #re_path(r'ws/yjs/(?P<document_id>\d+)/$', consumers.YjsRelayConsumer.as_asgi()),

]
