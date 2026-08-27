from fastapi import APIRouter, Form
from fastapi.responses import PlainTextResponse

from app.services.sms_service import process_sms

router = APIRouter(
    prefix="/sms",
    tags=["SMS"],
)


@router.post("/webhook", response_class=PlainTextResponse)
async def sms_webhook(
    from_: str = Form(alias="from"),
    text: str = Form(alias="text"),
):
    reply, status = process_sms(from_, text)

    return PlainTextResponse(
        content=reply,
        status_code=status,
    )
