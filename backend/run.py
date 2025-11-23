#!/usr/bin/env python3
"""Simple script to run the FastAPI server"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload in development
        log_level="info",
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem",
    )

