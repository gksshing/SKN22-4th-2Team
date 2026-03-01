"""
Database models for the application using SQLAlchemy.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # 1:N relationship with UserSession
    sessions = relationship("UserSession", back_populates="user")


class UserSession(Base):
    __tablename__ = "usersession"

    session_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 1:N relationship with SearchHistory
    searches = relationship("SearchHistory", back_populates="session", cascade="all, delete-orphan")
    user = relationship("User", back_populates="sessions")


class SearchHistory(Base):
    __tablename__ = "searchhistory"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("usersession.session_id", ondelete="CASCADE"), nullable=False, index=True)
    user_idea = Column(String, nullable=False)
    result_json = Column(Text, nullable=False)
    risk_level = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Reference to parent session
    session = relationship("UserSession", back_populates="searches")
