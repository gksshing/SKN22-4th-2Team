"""
Database module initialization.
"""
from .connection import Base, engine, get_db
from .models import UserSession, SearchHistory

__all__ = ["Base", "engine", "get_db", "UserSession", "SearchHistory"]
