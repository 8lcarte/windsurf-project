from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, List

from app.api.deps import get_current_user, get_db
from app.crud.crud_ai_agent import agent
from app.models.user import User
from app.schemas.ai_agent import (
    Agent,
    AgentCreate,
    AgentUpdate,
    AgentSpendingPattern,
    AgentActivityLog,
    AgentRiskMetrics,
)
from app.services.openai_service import openai_service

router = APIRouter()

@router.post("/", response_model=Agent)
async def create_agent(
    *,
    db: AsyncSession = Depends(get_db),
    agent_in: AgentCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new AI agent.
    """
    try:
        # Register the agent with OpenAI
        assistant_id = await openai_service.register_assistant(agent_in)
        
        # Create the agent in our database
        agent_data = agent_in.dict()
        agent_data["openai_assistant_id"] = assistant_id
        agent_obj = await agent.create(db, obj_in=agent_data)
        
        return agent_obj
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    *,
    db: AsyncSession = Depends(get_db),
    agent_id: int,
    agent_in: AgentUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update AI agent.
    """
    agent_obj = await agent.get(db, id=agent_id)
    if not agent_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
        
    try:
        # Update OpenAI assistant if needed
        if agent_obj.openai_assistant_id:
            await openai_service.update_assistant(
                agent_obj.openai_assistant_id,
                agent_in
            )
            
        # Update agent in our database
        agent_obj = await agent.update(db, db_obj=agent_obj, obj_in=agent_in)
        return agent_obj
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.delete("/{agent_id}", response_model=Agent)
async def delete_agent(
    *,
    db: AsyncSession = Depends(get_db),
    agent_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Delete AI agent.
    """
    agent_obj = await agent.get(db, id=agent_id)
    if not agent_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
        
    try:
        # Delete OpenAI assistant if it exists
        if agent_obj.openai_assistant_id:
            await openai_service.delete_assistant(agent_obj.openai_assistant_id)
            
        # Delete agent from our database
        agent_obj = await agent.remove(db, id=agent_id)
        return agent_obj
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.get("/", response_model=List[Agent])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Retrieve all AI agents.
    """
    agents = await agent.get_multi(db, skip=skip, limit=limit)
    return agents

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(
    *,
    db: AsyncSession = Depends(get_db),
    agent_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get AI agent by ID.
    """
    agent_obj = await agent.get(db, id=agent_id)
    if not agent_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    return agent_obj

@router.get("/{agent_id}/spending", response_model=AgentSpendingPattern)
async def get_agent_spending(
    *,
    db: AsyncSession = Depends(get_db),
    agent_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get agent spending patterns.
    """
    agent_obj = await agent.get(db, id=agent_id)
    if not agent_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    
    spending_patterns = await agent.get_spending_patterns(db, agent_id=agent_id)
    return spending_patterns

@router.get("/{agent_id}/activity", response_model=List[AgentActivityLog])
async def get_agent_activity(
    *,
    db: AsyncSession = Depends(get_db),
    agent_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get agent activity log.
    """
    agent_obj = await agent.get(db, id=agent_id)
    if not agent_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    
    activity_logs = await agent.get_activity_log(
        db, agent_id=agent_id, skip=skip, limit=limit
    )
    return activity_logs

@router.get("/{agent_id}/risk", response_model=AgentRiskMetrics)
async def get_agent_risk(
    *,
    db: AsyncSession = Depends(get_db),
    agent_id: int,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get agent risk metrics.
    """
    agent_obj = await agent.get(db, id=agent_id)
    if not agent_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    
    risk_metrics = await agent.get_risk_metrics(db, agent_id=agent_id)
    return risk_metrics 