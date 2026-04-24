import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.analyze import router as analyze_router
from routers.resume import router as resume_router

load_dotenv()

app = FastAPI(title="JobChrome API", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(analyze_router)
app.include_router(resume_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
