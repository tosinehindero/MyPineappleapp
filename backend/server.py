from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Store active chat sessions
chat_sessions = {}

# Sasha's system prompt - Luxury Travel Concierge
SASHA_SYSTEM_PROMPT = """You are Sasha, a high-end luxury travel concierge for PineapplePlay, an exclusive lifestyle community. 

Your personality:
- Discreet and sophisticated - never judgmental
- Warm but professional, like a trusted confidante
- Knowledgeable about luxury destinations worldwide
- Attentive to subtle preferences and desires

Your expertise includes:
- Clothing-optional and lifestyle-friendly resorts
- Private villas and exclusive retreats
- Adults-only luxury experiences
- Couples and group travel arrangements
- Discreet booking services

IMPORTANT: When suggesting destinations, ALWAYS format them as JSON blocks that can be rendered as cards. Use this exact format:

```destination
{
  "name": "Resort or Destination Name",
  "location": "City, Country",
  "type": "Resort Type (e.g., 'Clothing-Optional Resort', 'Private Villa', 'Luxury Retreat')",
  "description": "A compelling 2-3 sentence description",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "priceRange": "$$$$ or $$$$$ (luxury tier)",
  "imageQuery": "search term for destination image"
}
```

Always be helpful, make personalized recommendations based on the user's preferences and fantasies when provided, and maintain absolute discretion. Never be explicit - keep descriptions tasteful and sophisticated.

If the user shares their fantasies or preferences, acknowledge them tactfully and use them to personalize recommendations without being crude."""


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_fantasies: Optional[str] = None
    user_interests: Optional[List[str]] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


@api_router.post("/travel/chat", response_model=ChatResponse)
async def travel_chat(request: ChatRequest):
    """Chat with Sasha, the AI travel concierge"""
    try:
        session_id = request.session_id
        
        # Build personalized system prompt
        system_prompt = SASHA_SYSTEM_PROMPT
        if request.user_fantasies:
            system_prompt += f"\n\nUser's preferences and desires (use to personalize recommendations, be tactful):\n{request.user_fantasies}"
        if request.user_interests:
            system_prompt += f"\n\nUser's interests: {', '.join(request.user_interests)}"
        
        # Get or create chat session
        if session_id not in chat_sessions:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            if not api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=system_prompt
            ).with_model("gemini", "gemini-2.5-flash")
            
            chat_sessions[session_id] = chat
            logger.info(f"Created new chat session: {session_id}")
        else:
            chat = chat_sessions[session_id]
        
        # Send message and get response
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        # Store in MongoDB for persistence
        chat_doc = {
            "session_id": session_id,
            "user_message": request.message,
            "assistant_response": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.travel_chats.insert_one(chat_doc)
        
        return ChatResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise


@api_router.get("/travel/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    try:
        history = await db.travel_chats.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error fetching chat history: {str(e)}")
        return {"history": []}


@api_router.delete("/travel/chat/{session_id}")
async def clear_chat_session(session_id: str):
    """Clear a chat session"""
    try:
        if session_id in chat_sessions:
            del chat_sessions[session_id]
        await db.travel_chats.delete_many({"session_id": session_id})
        return {"success": True, "message": "Session cleared"}
    except Exception as e:
        logger.error(f"Error clearing session: {str(e)}")
        return {"success": False, "error": str(e)}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()