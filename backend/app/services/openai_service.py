from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
from openai import AsyncOpenAI, OpenAIError
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.ai_agent import AIAgent
from app.schemas.ai_agent import AgentCreate, AgentUpdate

# Configure logging
logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL_NAME
        
    async def register_assistant(self, agent_data: AgentCreate) -> str:
        """
        Register a new assistant with OpenAI.
        
        Args:
            agent_data: Data for creating the AI agent
            
        Returns:
            str: OpenAI Assistant ID
            
        Raises:
            HTTPException: If assistant creation fails
        """
        try:
            logger.info(f"Creating OpenAI assistant for agent: {agent_data.name}")
            
            # Define the assistant's tools based on agent configuration
            tools = self._get_assistant_tools(agent_data)
            
            # Create the assistant
            assistant = await self.client.beta.assistants.create(
                name=agent_data.name,
                description=agent_data.description,
                model=self.model,
                tools=tools,
                metadata={
                    "daily_spend_limit": str(agent_data.daily_spend_limit),
                    "monthly_spend_limit": str(agent_data.monthly_spend_limit),
                    "allowed_merchant_categories": ",".join(agent_data.allowed_merchant_categories or []),
                    "allowed_merchants": ",".join(agent_data.allowed_merchants or []),
                    "max_transaction_amount": str(agent_data.max_transaction_amount),
                }
            )
            
            logger.info(f"Successfully created OpenAI assistant with ID: {assistant.id}")
            return assistant.id
            
        except OpenAIError as e:
            logger.error(f"OpenAI assistant creation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create OpenAI assistant: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during assistant creation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during assistant creation"
            )

    async def update_assistant(self, assistant_id: str, agent_data: AgentUpdate) -> None:
        """
        Update an existing OpenAI assistant.
        
        Args:
            assistant_id: OpenAI Assistant ID
            agent_data: Updated agent data
            
        Raises:
            HTTPException: If assistant update fails
        """
        try:
            logger.info(f"Updating OpenAI assistant: {assistant_id}")
            
            update_data = {}
            if agent_data.name is not None:
                update_data["name"] = agent_data.name
            if agent_data.description is not None:
                update_data["description"] = agent_data.description
                
            # Update metadata if relevant fields are provided
            metadata = {}
            if agent_data.daily_spend_limit is not None:
                metadata["daily_spend_limit"] = str(agent_data.daily_spend_limit)
            if agent_data.monthly_spend_limit is not None:
                metadata["monthly_spend_limit"] = str(agent_data.monthly_spend_limit)
            if agent_data.allowed_merchant_categories is not None:
                metadata["allowed_merchant_categories"] = ",".join(agent_data.allowed_merchant_categories)
            if agent_data.allowed_merchants is not None:
                metadata["allowed_merchants"] = ",".join(agent_data.allowed_merchants)
            if agent_data.max_transaction_amount is not None:
                metadata["max_transaction_amount"] = str(agent_data.max_transaction_amount)
                
            if metadata:
                update_data["metadata"] = metadata
                
            if update_data:
                await self.client.beta.assistants.update(
                    assistant_id=assistant_id,
                    **update_data
                )
                
            logger.info(f"Successfully updated OpenAI assistant: {assistant_id}")
            
        except OpenAIError as e:
            logger.error(f"OpenAI assistant update failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update OpenAI assistant: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during assistant update: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during assistant update"
            )

    async def delete_assistant(self, assistant_id: str) -> None:
        """
        Delete an OpenAI assistant.
        
        Args:
            assistant_id: OpenAI Assistant ID
            
        Raises:
            HTTPException: If assistant deletion fails
        """
        try:
            logger.info(f"Deleting OpenAI assistant: {assistant_id}")
            await self.client.beta.assistants.delete(assistant_id=assistant_id)
            logger.info(f"Successfully deleted OpenAI assistant: {assistant_id}")
            
        except OpenAIError as e:
            logger.error(f"OpenAI assistant deletion failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete OpenAI assistant: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during assistant deletion: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during assistant deletion"
            )

    async def validate_function_call(
        self,
        assistant_id: str,
        function_name: str,
        parameters: Dict[str, Any]
    ) -> bool:
        """
        Validate a function call against the assistant's permissions.
        
        Args:
            assistant_id: OpenAI Assistant ID
            function_name: Name of the function being called
            parameters: Function parameters
            
        Returns:
            bool: Whether the function call is valid
            
        Raises:
            HTTPException: If validation fails
        """
        try:
            logger.info(f"Validating function call for assistant {assistant_id}: {function_name}")
            
            # Get assistant metadata
            assistant = await self.client.beta.assistants.retrieve(assistant_id=assistant_id)
            metadata = assistant.metadata
            
            # Validate based on function and parameters
            if function_name == "make_payment":
                amount = float(parameters.get("amount", 0))
                merchant = parameters.get("merchant")
                category = parameters.get("category")
                
                # Check amount limits
                max_amount = float(metadata.get("max_transaction_amount", 0))
                if max_amount and amount > max_amount:
                    logger.warning(f"Transaction amount {amount} exceeds maximum {max_amount}")
                    return False
                
                # Check merchant restrictions
                allowed_merchants = metadata.get("allowed_merchants", "").split(",")
                if allowed_merchants and merchant not in allowed_merchants:
                    logger.warning(f"Merchant {merchant} not in allowed list")
                    return False
                
                # Check category restrictions
                allowed_categories = metadata.get("allowed_merchant_categories", "").split(",")
                if allowed_categories and category not in allowed_categories:
                    logger.warning(f"Category {category} not in allowed list")
                    return False
                
            logger.info(f"Function call validation successful for {function_name}")
            return True
            
        except OpenAIError as e:
            logger.error(f"OpenAI function validation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to validate function call: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during function validation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during function validation"
            )

    def _get_assistant_tools(self, agent_data: AgentCreate) -> List[Dict[str, Any]]:
        """
        Get the list of tools to be assigned to the assistant.
        
        Args:
            agent_data: Agent configuration data
            
        Returns:
            List[Dict[str, Any]]: List of tool configurations
        """
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "make_payment",
                    "description": "Make a payment using the virtual card",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "amount": {
                                "type": "number",
                                "description": "Payment amount"
                            },
                            "merchant": {
                                "type": "string",
                                "description": "Merchant name"
                            },
                            "category": {
                                "type": "string",
                                "description": "Merchant category"
                            },
                            "description": {
                                "type": "string",
                                "description": "Payment description"
                            }
                        },
                        "required": ["amount", "merchant"]
                    }
                }
            }
        ]
        
        return tools

openai_service = OpenAIService() 