from typing import List, Dict
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory

from app.ai.tools.transaction_tools import (
    GetTransactionHistoryTool,
    AnalyzeSpendingPatternsTool,
    GetBudgetRecommendationsTool
)

class FinancialAdvisorAgent:
    def __init__(self, openai_api_key: str):
        # Initialize the language model
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-4-turbo-preview",
            api_key=openai_api_key
        )
        
        # Initialize memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

        # Initialize tools
        self.tools = [
            GetTransactionHistoryTool(),
            AnalyzeSpendingPatternsTool(),
            GetBudgetRecommendationsTool()
        ]

        # Create the agent prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful financial advisor AI. 
            Your goal is to help users understand their spending patterns and make better financial decisions.
            Use the available tools to analyze transactions and provide personalized recommendations.
            Always be professional but friendly in your responses."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # Create the agent
        self.agent = create_openai_functions_agent(
            llm=self.llm,
            prompt=prompt,
            tools=self.tools
        )

        # Create the agent executor
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True
        )

    async def process_query(self, user_id: str, query: str) -> Dict:
        """
        Process a user query and return the agent's response
        """
        # Add user context to the query
        context = {"user_id": user_id}
        
        try:
            response = await self.agent_executor.ainvoke(
                {
                    "input": query,
                    "context": context
                }
            )
            return {
                "status": "success",
                "response": response["output"],
                "thought_process": response.get("intermediate_steps", [])
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
