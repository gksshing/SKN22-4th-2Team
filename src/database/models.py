"""
Database models for the application using SQLAlchemy.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .connection import Base


class User(Base):
    """사용자 계정 모델"""
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserSession(Base):
    __tablename__ = "usersession"

    session_id = Column(String, primary_key=True, index=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Auth 구현 전 임시 컬럼: 로그인 사용자의 ID를 세션과 연결
    # Auth 완성 시 User 모델 FK로 교체 예정
    user_id = Column(Integer, nullable=True, index=True)
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


