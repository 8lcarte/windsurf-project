from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from jsonschema import validate, ValidationError

from app.models.agent_function import AgentFunction, FunctionPermission, FunctionUsageStats
from app.models.ai_agent import AIAgent

logger = logging.getLogger(__name__)

class AgentFunctionRegistry:
    """Service for managing agent functions"""

    def __init__(self):
        self._registered_functions: Dict[str, AgentFunction] = {}

    async def register_function(
        self,
        db: AsyncSession,
        name: str,
        description: str,
        parameters_schema: Dict[str, Any],
        return_schema: Optional[Dict[str, Any]] = None,
        requires_approval: bool = False,
        required_permissions: Optional[List[str]] = None
    ) -> AgentFunction:
        """Register a new function that can be called by agents"""
        # Check if function already exists
        query = select(AgentFunction).where(AgentFunction.name == name)
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Increment version if function exists
            function = AgentFunction(
                name=name,
                description=description,
                parameters_schema=parameters_schema,
                return_schema=return_schema,
                requires_approval=requires_approval,
                required_permissions=required_permissions,
                version=existing.version + 1,
                created_at=datetime.utcnow()
            )
            existing.is_active = False
        else:
            function = AgentFunction(
                name=name,
                description=description,
                parameters_schema=parameters_schema,
                return_schema=return_schema,
                requires_approval=requires_approval,
                required_permissions=required_permissions,
                version=1,
                created_at=datetime.utcnow()
            )
        
        db.add(function)
        await db.commit()
        await db.refresh(function)
        return function

    async def validate_parameters(
        self,
        db: AsyncSession,
        function_name: str,
        parameters: Dict[str, Any]
    ) -> bool:
        """Validate parameters against function schema"""
        query = select(AgentFunction).where(
            AgentFunction.name == function_name,
            AgentFunction.is_active == True
        )
        result = await db.execute(query)
        function = result.scalar_one_or_none()
        
        if not function:
            raise ValueError(f"Function {function_name} not found")
            
        try:
            validate(instance=parameters, schema=function.parameters_schema)
            return True
        except ValidationError:
            return False

    async def check_permissions(
        self,
        db: AsyncSession,
        function_name: str,
        agent: AIAgent
    ) -> bool:
        """Check if agent has permission to call function"""
        query = select(AgentFunction).where(
            AgentFunction.name == function_name,
            AgentFunction.is_active == True
        )
        result = await db.execute(query)
        function = result.scalar_one_or_none()
        
        if not function:
            raise ValueError(f"Function {function_name} not found")
            
        # Check function permissions
        query = select(FunctionPermission).where(
            FunctionPermission.function_id == function.id,
            FunctionPermission.agent_type == agent.type
        )
        result = await db.execute(query)
        permission = result.scalar_one_or_none()
        
        if not permission:
            return False
            
        # Check if agent has required permissions
        if function.required_permissions:
            # TODO: Implement more sophisticated permission checking
            return True
            
        return True

    async def track_usage(
        self,
        db: AsyncSession,
        function_name: str,
        agent_id: int,
        success: bool,
        response_time: float
    ) -> None:
        """Track function usage statistics"""
        query = select(AgentFunction).where(
            AgentFunction.name == function_name,
            AgentFunction.is_active == True
        )
        result = await db.execute(query)
        function = result.scalar_one_or_none()
        
        if not function:
            raise ValueError(f"Function {function_name} not found")
            
        # Get or create usage stats
        query = select(FunctionUsageStats).where(
            FunctionUsageStats.function_id == function.id,
            FunctionUsageStats.agent_id == agent_id
        )
        result = await db.execute(query)
        stats = result.scalar_one_or_none()
        
        if not stats:
            stats = FunctionUsageStats(
                function_id=function.id,
                agent_id=agent_id,
                call_count=0,
                success_count=0,
                failure_count=0,
                average_response_time=0,
                created_at=datetime.utcnow()
            )
            db.add(stats)
        
        # Update stats
        stats.call_count += 1
        if success:
            stats.success_count += 1
        else:
            stats.failure_count += 1
            
        # Update average response time
        stats.average_response_time = (
            (stats.average_response_time * (stats.call_count - 1) + response_time)
            / stats.call_count
        )
        stats.last_called_at = datetime.utcnow()
        
        await db.commit()

    async def list_functions(
        self,
        db: AsyncSession,
        active_only: bool = True
    ) -> List[AgentFunction]:
        """List all registered functions"""
        query = select(AgentFunction)
        if active_only:
            query = query.where(AgentFunction.is_active == True)
        result = await db.execute(query)
        return result.scalars().all()

# Create singleton instance
agent_function_registry = AgentFunctionRegistry() 