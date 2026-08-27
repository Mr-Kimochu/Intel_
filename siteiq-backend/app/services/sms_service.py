from app.services.analysis_service import AnalysisService
from app.services.sms_formatter import format_sms_report

from app.services.conversation_service import (
    get_conversation,
    create_conversation,
    update_conversation,
)


def process_sms(phone: str, message: str):

    message = message.strip()

    conversation = get_conversation(phone)

    if conversation is None:

        conversation = create_conversation(phone)

        return (
            """Welcome to SiteIntel.

Choose a service

1 - Site Assessment
2 - Flood Risk
3 - Climate Outlook""",
            200,
        )

    state = conversation["state"]

    # ------------------------------------------------
    # Waiting for user to choose a service
    # ------------------------------------------------

    if state == "waiting_service":

        if message == "1":

            update_conversation(
                phone,
                state="waiting_location",
                selected_service="site",
            )

            return (
                "Enter the location to assess.\n\nExample:\nKitengela",
                200,
            )

        elif message == "2":

            update_conversation(
                phone,
                state="waiting_location",
                selected_service="flood",
            )

            return (
                "Enter the location for flood risk analysis.",
                200,
            )

        elif message == "3":

            update_conversation(
                phone,
                state="waiting_location",
                selected_service="climate",
            )

            return (
                "Enter the location for climate outlook.",
                200,
            )

        return (
            "Invalid choice.\nReply with 1, 2 or 3.",
            200,
        )

    # ------------------------------------------------
    # Waiting for location
    # ------------------------------------------------

    if state == "waiting_location":
        update_conversation(
            phone,
            location=message,
            state="processing",
        )

        try:
            report = AnalysisService.run_from_location(message)

            sms_reply = format_sms_report(
                report,
                conversation["selected_service"],
            )

            update_conversation(
                phone,
                state="completed",
            )

            return (
                sms_reply,
                200,
            )

        except Exception as e:

            update_conversation(
                phone,
                state="waiting_location",
            )

            return (
                f"Analysis failed.\n{str(e)}",
                200,
            )

    return (
        "Send ASSESS to begin.",
        200,
    )
