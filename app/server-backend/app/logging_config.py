import logging
from pydantic import BaseModel

class LogConfig(BaseModel):
    """Logging configuration to be set for the server"""

    LOGGER_NAME: str = "resume_analyzer"
    LOG_FORMAT: str = "%(levelprefix)s | %(asctime)s | %(name)s | %(message)s"
    LOG_LEVEL: str = "DEBUG"

    # Logging config
    version: int = 1
    disable_existing_loggers: bool = False
    
    formatters: dict = {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": LOG_FORMAT,
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    }
    
    handlers: dict = {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
    }
    
    loggers: dict = {
        # The logger for your specific application code
        LOGGER_NAME: {"handlers": ["default"], "level": LOG_LEVEL},
        # Ensure uvicorn logs use the same format
        "uvicorn": {"handlers": ["default"], "level": "INFO"},
        "uvicorn.error": {"level": "INFO"},
        "uvicorn.access": {"handlers": ["default"], "level": "INFO"},
    }

# --- Helper function to get a logger in other files ---
def get_logger(name: str):
    return logging.getLogger(f"resume_analyzer.{name}")