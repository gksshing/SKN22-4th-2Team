"""
Database models for the application using SQLAlchemy.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserSession(Base):
    __tablename__ = "usersession"

    session_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # Optional link to user
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to user
    user = relationship("User", backref="sessions")
    # 1:N relationship with SearchHistory
    searches = relationship("SearchHistory", back_populates="session", cascade="all, delete-orphan")


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
