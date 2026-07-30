from fastapi import APIRouter
from pydantic import BaseModel

from app.services.analysis_service import AnalysisService

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
)


class AnalysisRequest(BaseModel):
    location: str
    radius_m: int = 500


@router.post("/run")
def run_analysis(request: AnalysisRequest):
    return AnalysisService.run_from_location(
        location=request.location,
        radius_m=request.radius_m,
    )
