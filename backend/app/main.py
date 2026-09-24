from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, analysis, standards, reports, chat, admin

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="SIH26108 - AI-Powered Recommendation Engine for Identifying Applicable Indian Standards for Procurement Specifications."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api/v1
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(analysis.router, prefix=settings.api_prefix)
app.include_router(standards.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)

@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "1.0.0",
        "docs_url": "/docs",
        "api_v1_prefix": settings.api_prefix
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.environment}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
