# app/services/translations.py

MESSAGES = {
    "en": {
        "welcome": """Welcome to SiteIntel

Choose a service

1 - Site Assessment
2 - Flood Risk
3 - Climate Outlook"""
    },

    "sw": {
        "welcome": """Karibu SiteIntel

Chagua huduma

1 - Tathmini ya Eneo
2 - Hatari ya Mafuriko
3 - Hali ya Hewa"""
    }
}


def t(language: str, key: str):
    return MESSAGES.get(language, MESSAGES["en"]).get(
        key,
        MESSAGES["en"].get(key, "")
    )
