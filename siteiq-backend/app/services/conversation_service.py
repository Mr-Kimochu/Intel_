from app.services.supabase_service import get_supabase


def get_conversation(phone_number: str):
    sb = get_supabase()

    print("Supabase client:", sb)

    query = (
        sb.table("sms_conversations")
        .select("*")
        .eq("phone_number", phone_number)
        .maybe_single()
    )

    print("Query object:", query)

    result = query.execute()

    print("Execute result:", result)
    print("Result type:", type(result))

    if result is None:
        return None

    return result.data


def create_conversation(phone_number: str):
    sb = get_supabase()

    result = (
        sb.table("sms_conversations")
        .insert(
            {
                "phone_number": phone_number,
                "state": "waiting_service",
            }
        )
        .execute()
    )

    return result.data[0]


def update_conversation(phone_number: str, **updates):
    sb = get_supabase()

    (
        sb.table("sms_conversations")
        .update(updates)
        .eq("phone_number", phone_number)
        .execute()
    )


def reset_conversation(phone_number: str):
    update_conversation(
        phone_number,
        state="idle",
        selected_service=None,
        location=None,
    )
