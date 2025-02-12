from datetime import datetime
from typing import Dict, Any
from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from . import Base

class AgentFunction(Base):
    """Model for registered agent functions"""
    __tablename__ = "agent_functions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=False)
    parameters_schema = Column(JSON, nullable=False)  # JSON Schema for function parameters
    return_schema = Column(JSON, nullable=True)  # JSON Schema for return value
    is_active = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    required_permissions = Column(JSON, default=list)  # List of required permissions
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    usage_stats = relationship("FunctionUsageStats", back_populates="function")
    permissions = relationship("FunctionPermission", back_populates="function")

class FunctionPermission(Base):
    """Model for function permissions"""
    __tablename__ = "function_permissions"

    id = Column(Integer, primary_key=True, index=True)
    function_id = Column(Integer, ForeignKey("agent_functions.id"), nullable=False)
    agent_type = Column(String, nullable=False)  # Type of agent (e.g., "shopping", "travel")
    permission_level = Column(String, nullable=False)  # e.g., "read", "write", "execute"
    conditions = Column(JSON, nullable=True)  # Additional conditions for permission
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    function = relationship("AgentFunction", back_populates="permissions")

class FunctionUsageStats(Base):
    """Model for tracking function usage"""
    __tablename__ = "function_usage_stats"

    id = Column(Integer, primary_key=True, index=True)
    function_id = Column(Integer, ForeignKey("agent_functions.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("ai_agents.id"), nullable=False)
    call_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    average_response_time = Column(Integer)  # in milliseconds
    last_called_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    function = relationship("AgentFunction", back_populates="usage_stats")
    agent = relationship("AIAgent", back_populates="function_usage") 