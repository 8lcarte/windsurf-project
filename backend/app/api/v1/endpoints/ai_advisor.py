from typing import Dict
from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings
from app.core.deps import get_current_user
from app.ai.agent import FinancialAdvisorAgent
from pydantic import BaseModel

router = APIRouter()

# Initialize the AI agent
financial_advisor = FinancialAdvisorAgent(openai_api_key=settings.OPENAI_API_KEY)

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    status: str
    response: str
    thought_process: list = []

@router.post("/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    current_user = Depends(get_current_user)
) -> Dict:
    """
    Process a natural language query about the user's finances
    """
    try:
        result = await financial_advisor.process_query(
            user_id=str(current_user.id),
            query=request.query
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )
