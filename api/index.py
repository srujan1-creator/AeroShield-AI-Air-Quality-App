import os
import sys

# Ensure the root project directory is on sys.path so app and its modules import cleanly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app as fastapi_app


class VercelPathFixMiddleware:
    """
    Vercel Serverless Path Normalizer:
    When Vercel rewrites /.* requests to /api/index.py, the ASGI scope['path']
    arrives as '/api/index.py'. This middleware restores the actual client-requested
    path from Vercel's 'x-matched-path' or routing headers, ensuring FastAPI
    matches the proper routes ('/', '/api/health', '/static/css/style.css', etc.).
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            matched_path = (
                headers.get(b"x-matched-path")
                or headers.get(b"x-vercel-matched-path")
                or headers.get(b"x-forwarded-uri")
                or headers.get(b"x-original-url")
            )
            if matched_path:
                path_str = matched_path.decode("utf-8").split("?")[0]
                if path_str in ("/api/index.py", "/api/index", "/api"):
                    path_str = "/"
                scope["path"] = path_str
                scope["raw_path"] = path_str.encode("utf-8")
            else:
                curr_path = scope.get("path", "")
                if curr_path in ("/api/index.py", "/api/index", "/api"):
                    scope["path"] = "/"
                    scope["raw_path"] = b"/"
                elif curr_path.startswith("/api/index.py/"):
                    sub_path = curr_path[len("/api/index.py"):]
                    scope["path"] = sub_path if sub_path else "/"
                    scope["raw_path"] = scope["path"].encode("utf-8")

        await self.app(scope, receive, send)


app = VercelPathFixMiddleware(fastapi_app)
