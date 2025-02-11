import React from 'react';
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import { SmartToyRounded } from '@mui/icons-material';

export const LangChainIntegration: React.FC = () => {
  return (
    <>
      <Box display="flex" alignItems="center" mb={3}>
        <SmartToyRounded sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h4">LangChain Integration</Typography>
      </Box>

      <Typography variant="body1" paragraph>
        Enable your LangChain agents to create and manage virtual cards for payments. Perfect for AI agents that need to make purchases
        on behalf of users, such as shopping assistants, travel booking agents, or automated procurement systems.
      </Typography>

      <Typography variant="body1" paragraph>
        Our platform helps you manage virtual cards across multiple agent types and instances. Whether you're running hundreds of shopping assistants
        or thousands of procurement agents, you can easily organize, track, and control all virtual cards through our hierarchical management system.
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        To get started, you'll need a Windsurf API key. Sign up for an account and generate your API key from the dashboard.
      </Alert>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Installation
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            backgroundColor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
{`pip install windsurf-sdk langchain`}</Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Creating Virtual Cards in Your LangChain Agent
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Here's how to create a tool that allows your LangChain agent to create and manage virtual cards:
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            backgroundColor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
{`from langchain.tools import BaseTool
from windsurf_sdk import WindsurfAPI
from typing import Optional

class CreateVirtualCardTool(BaseTool):
    name = "create_virtual_card"
    description = """Creates a virtual card for making payments.
    Use this when you need to make a purchase and require payment credentials.
    
    Args:
        name: A descriptive name for the card (e.g., "Flight Booking for User123")
        spending_limit: Maximum amount that can be spent on this card
        agent_type: Type of agent requesting the card (e.g., "shopping_assistant", "travel_agent")
        agent_instance_id: Unique identifier for the agent instance
        end_user_id: ID of the end user this card is being created for
        expiry_days: Number of days until the card expires (optional)
        metadata: Additional information about the card's purpose (optional)
    """
    
    def __init__(self):
        super().__init__()
        self.client = WindsurfAPI()  # Initialize with your API key
    
    def _run(
        self,
        name: str,
        spending_limit: float,
        agent_type: str,
        agent_instance_id: str,
        end_user_id: str,
        expiry_days: Optional[int] = 7,
        metadata: Optional[dict] = None
    ) -> dict:
        """Create a new virtual card"""
        try:
            # Organize card metadata for easy filtering and management
            organized_metadata = {
                **metadata if metadata else {},
                'agent_type': agent_type,
                'agent_instance_id': agent_instance_id,
                'end_user_id': end_user_id,
            }
            
            card = self.client.virtual_cards.create(
                name=name,
                spending_limit=spending_limit,
                expiry_days=expiry_days,
                metadata=organized_metadata
            )
            return {
                "card_id": card.id,
                "card_number": card.number,
                "expiry": card.expiry,
                "cvv": card.cvv,
                "status": card.status
            }
        except Exception as e:
            return {"error": str(e)}

# Example Agent Types
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from uuid import uuid4
from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAgent(ABC):
    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.instance_id = str(uuid4())
        self.card_tool = CreateVirtualCardTool()
        
        # Create the agent with appropriate tools
        tools = self._get_tools()
        llm = ChatOpenAI(temperature=0)
        agent = create_openai_functions_agent(llm, tools)
        self.executor = AgentExecutor(agent=agent, tools=tools)
    
    @abstractmethod
    def _get_tools(self) -> list:
        """Get the tools needed for this agent type"""
        pass
    
    async def process_request(self, user_id: str, request: str) -> Dict[str, Any]:
        return await self.executor.ainvoke({
            "input": request,
            "context": {
                "agent_type": self.agent_type,
                "agent_instance_id": self.instance_id,
                "user_id": user_id
            }
        })

class ShoppingAssistantAgent(BaseAgent):
    def __init__(self):
        super().__init__("shopping_assistant")
    
    def _get_tools(self) -> list:
        return [
            self.card_tool,
            PriceComparisonTool(),  # Compare prices across retailers
            InventoryCheckTool(),   # Check if items are in stock
        ]

class TravelBookingAgent(BaseAgent):
    def __init__(self):
        super().__init__("travel_agent")
    
    def _get_tools(self) -> list:
        return [
            self.card_tool,
            FlightSearchTool(),     # Search for flights
            HotelBookingTool(),     # Book hotels
            self._create_card_with_travel_rules()
        ]
    
    def _create_card_with_travel_rules(self):
        # Customize card creation with travel-specific rules
        return CreateVirtualCardTool(
            default_metadata={
                "category": "travel",
                "requires_verification": True,
                "allowed_merchants": ["airlines", "hotels", "car_rental"]
            }
        )

class ProcurementAgent(BaseAgent):
    def __init__(self):
        super().__init__("procurement_agent")
    
    def _get_tools(self) -> list:
        return [
            self.card_tool,
            VendorValidationTool(),  # Validate vendor credentials
            QuoteComparisonTool(),   # Compare vendor quotes
            self._create_card_with_procurement_rules()
        ]
    
    def _create_card_with_procurement_rules(self):
        return CreateVirtualCardTool(
            default_metadata={
                "category": "procurement",
                "requires_approval": True,
                "approval_threshold": 5000,
                "department_tracking": True
            }
        )

class SubscriptionManager(BaseAgent):
    def __init__(self):
        super().__init__("subscription_manager")
    
    def _get_tools(self) -> list:
        return [
            self.card_tool,
            SubscriptionTrackingTool(),  # Track recurring payments
            UsageAnalysisTool(),         # Analyze service usage
            self._create_card_with_subscription_rules()
        ]
    
    def _create_card_with_subscription_rules(self):
        return CreateVirtualCardTool(
            default_metadata={
                "category": "subscription",
                "recurring": True,
                "billing_cycle": "monthly",
                "auto_suspend_on_overuse": True
            }
        )

# Detailed Examples

# 1. Shopping Assistant Example
async def shopping_assistant_example():
    agent = ShoppingAssistantAgent()
    
    # Scenario 1: Single high-value purchase with price comparison
    laptop_response = await agent.process_request(
        user_id="user123",
        request="Find and purchase a MacBook Pro, budget $2000"
    )
    # Agent will:
    # 1. Use PriceComparisonTool to find best deal
    # 2. Check stock availability
    # 3. Create card with exact amount needed
    # 4. Include retailer info in metadata
    
    # Scenario 2: Multiple items from different vendors
    setup_response = await agent.process_request(
        user_id="user123",
        request="Buy a desk setup: monitor ($400), keyboard ($150), mouse ($80)"
    )
    # Agent will:
    # 1. Create separate cards for each vendor
    # 2. Track items as a bundle in metadata
    # 3. Set individual spending limits

# 2. Travel Booking Example
async def travel_booking_example():
    agent = TravelBookingAgent()
    
    # Scenario 1: Complex itinerary with multiple bookings
    trip_response = await agent.process_request(
        user_id="user456",
        request="""Plan a business trip to NYC:
        - Flight from SF (Dec 10-15)
        - 4-star hotel in Manhattan
        - Airport transfers"""
    )
    # Agent will:
    # 1. Create card for flight with airline-specific rules
    # 2. Create separate card for hotel with pre-authorization
    # 3. Create card for ground transport with lower limit
    # 4. Link all cards in metadata with trip_id
    
    # Scenario 2: Last-minute booking with premium options
    urgent_response = await agent.process_request(
        user_id="user456",
        request="Need next available business class flight to London"
    )
    # Agent will:
    # 1. Create card with higher limit for business class
    # 2. Add urgent booking flag in metadata
    # 3. Enable premium travel insurance

# 3. Procurement Agent Example
async def procurement_example():
    agent = ProcurementAgent()
    
    # Scenario 1: Large purchase requiring approval
    office_response = await agent.process_request(
        user_id="user789",
        request="""Order office equipment:
        - 100 ergonomic chairs ($300 each)
        - 50 standing desks ($500 each)
        Total budget: $55,000"""
    )
    # Agent will:
    # 1. Get quotes from approved vendors
    # 2. Create approval request for amount > $5000
    # 3. Create cards with department tracking
    # 4. Schedule staged payments if needed
    
    # Scenario 2: Regular supplier payment
    supplies_response = await agent.process_request(
        user_id="user789",
        request="Reorder monthly office supplies from Staples"
    )
    # Agent will:
    # 1. Use historical data for budget
    # 2. Create card with preferred vendor rules
    # 3. Add recurring order metadata

# 4. Subscription Manager Example
async def subscription_example():
    agent = SubscriptionManager()
    
    # Scenario 1: Setting up enterprise software licenses
    saas_response = await agent.process_request(
        user_id="user101",
        request="""Set up software subscriptions:
        - Slack Enterprise ($15/user, 100 users)
        - Jira ($7/user, 50 users)
        - Zoom Pro ($20/host, 10 hosts)"""
    )
    # Agent will:
    # 1. Create separate cards for each service
    # 2. Set up recurring billing metadata
    # 3. Configure usage alerts
    # 4. Add license count tracking
    
    # Scenario 2: Usage-based subscription
    cloud_response = await agent.process_request(
        user_id="user101",
        request="Set up AWS account with $5000 monthly budget"
    )
    # Agent will:
    # 1. Create card with usage-based limits
    # 2. Set up daily monitoring
    # 3. Configure auto-suspension rules
    # 4. Add budget alert thresholds

# Example of running all scenarios
async def main():
    await shopping_assistant_example()
    await travel_booking_example()
    await procurement_example()
    await subscription_example()`}</Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Managing Cards Across Agents
        </Typography>
        <Typography variant="body2" paragraph>
          Our SDK provides tools to help you manage virtual cards across your entire agent fleet:
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="ListCardsByAgentType"
              secondary="Get all cards created by a specific type of agent (e.g., all shopping assistant cards)"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="ListCardsByAgentInstance"
              secondary="Get all cards created by a specific agent instance"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="ListCardsByEndUser"
              secondary="Get all cards created for a specific end user"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="GetAgentMetrics"
              secondary="Get spending metrics and card usage statistics by agent type or instance"
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Card Management Tools
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="GetVirtualCardTool"
              secondary="Retrieve details of an existing virtual card"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="UpdateVirtualCardTool"
              secondary="Modify card settings like spending limits or expiry"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="FreezeVirtualCardTool"
              secondary="Temporarily disable a virtual card"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="BulkUpdateTool"
              secondary="Update settings for multiple cards matching specific criteria"
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Dashboard & Analytics
        </Typography>
        <Typography variant="body2" paragraph>
          Monitor and manage your agent fleet through our dashboard:
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Agent Type Overview"
              secondary="View performance metrics and spending patterns by agent type"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Instance Monitoring"
              secondary="Track individual agent instances and their card usage"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="End User Analytics"
              secondary="Analyze spending patterns across your end users"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Anomaly Detection"
              secondary="Get alerts for unusual spending patterns or potential issues"
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Security Best Practices
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Set Appropriate Spending Limits"
              secondary="Always set spending limits that match the expected transaction amount"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Use Short Expiry Windows"
              secondary="Create cards with short expiry periods to minimize risk"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Include Detailed Metadata"
              secondary="Add context about the purpose of each card for better tracking"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Implement Rate Limiting"
              secondary="Add rate limiting to prevent excessive card creation"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Agent Type Policies"
              secondary="Set specific spending rules and limits by agent type"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="End User Verification"
              secondary="Verify end user identity before creating cards on their behalf"
            />
          </ListItem>
        </List>
      </Paper>
    </>
  );
};

