from fastapi import FastAPI, APIRouter, Request, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest


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


# ===========================================
# MARKETPLACE ENDPOINTS
# ===========================================

# Marketplace Models
class MarketplaceListing(BaseModel):
    title: str
    description: str
    price: float  # in USD
    category: str
    condition: str  # 'new', 'like_new', 'good', 'fair'
    images: List[str] = []
    seller_id: str
    seller_username: str


class CreateListingRequest(BaseModel):
    title: str
    description: str
    price: float
    category: str
    condition: str
    images: List[str] = []
    seller_id: str
    seller_username: str


class PurchaseRequest(BaseModel):
    listing_id: str
    buyer_id: str
    buyer_email: str
    origin_url: str


class ReportListingRequest(BaseModel):
    listing_id: str
    reporter_id: str
    reason: str
    details: Optional[str] = None


# Platform fee percentage (3%)
PLATFORM_FEE_PERCENT = 0.03


@api_router.post("/marketplace/listings")
async def create_listing(request: CreateListingRequest):
    """Create a new marketplace listing"""
    try:
        listing_id = str(uuid.uuid4())
        listing_doc = {
            "listing_id": listing_id,
            "title": request.title,
            "description": request.description,
            "price": request.price,
            "category": request.category,
            "condition": request.condition,
            "images": request.images,
            "seller_id": request.seller_id,
            "seller_username": request.seller_username,
            "status": "active",  # active, sold, removed
            "created_at": datetime.now(timezone.utc).isoformat(),
            "views": 0,
            "reports": [],
        }
        await db.marketplace_listings.insert_one(listing_doc)
        
        return {"success": True, "listing_id": listing_id}
    except Exception as e:
        logger.error(f"Error creating listing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/marketplace/listings")
async def get_listings(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    limit: int = 50
):
    """Get marketplace listings with optional filters"""
    try:
        query = {"status": "active"}
        
        if category:
            query["category"] = category
        if condition:
            query["condition"] = condition
        if min_price is not None:
            query["price"] = {"$gte": min_price}
        if max_price is not None:
            if "price" in query:
                query["price"]["$lte"] = max_price
            else:
                query["price"] = {"$lte": max_price}
        
        listings = await db.marketplace_listings.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {"success": True, "listings": listings}
    except Exception as e:
        logger.error(f"Error fetching listings: {str(e)}")
        return {"success": False, "listings": [], "error": str(e)}


@api_router.get("/marketplace/listings/{listing_id}")
async def get_listing(listing_id: str):
    """Get a single listing by ID"""
    try:
        listing = await db.marketplace_listings.find_one(
            {"listing_id": listing_id},
            {"_id": 0}
        )
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Increment view count
        await db.marketplace_listings.update_one(
            {"listing_id": listing_id},
            {"$inc": {"views": 1}}
        )
        
        return {"success": True, "listing": listing}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching listing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/marketplace/my-listings/{seller_id}")
async def get_my_listings(seller_id: str):
    """Get all listings for a seller"""
    try:
        listings = await db.marketplace_listings.find(
            {"seller_id": seller_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"success": True, "listings": listings}
    except Exception as e:
        logger.error(f"Error fetching seller listings: {str(e)}")
        return {"success": False, "listings": [], "error": str(e)}


@api_router.delete("/marketplace/listings/{listing_id}")
async def delete_listing(listing_id: str, seller_id: str):
    """Delete a listing (only by owner)"""
    try:
        result = await db.marketplace_listings.update_one(
            {"listing_id": listing_id, "seller_id": seller_id},
            {"$set": {"status": "removed"}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found or unauthorized")
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting listing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class UpdateListingRequest(BaseModel):
    title: str
    description: str
    price: float
    category: str
    condition: str
    seller_id: str
    images: list[str] = []


@api_router.put("/marketplace/listings/{listing_id}")
async def update_listing(listing_id: str, request: UpdateListingRequest):
    """Update a listing (only by owner)"""
    try:
        result = await db.marketplace_listings.update_one(
            {"listing_id": listing_id, "seller_id": request.seller_id, "status": {"$ne": "sold"}},
            {"$set": {
                "title": request.title,
                "description": request.description,
                "price": request.price,
                "category": request.category,
                "condition": request.condition,
                "images": request.images,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Listing not found, unauthorized, or already sold")
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating listing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/marketplace/purchase")
async def initiate_purchase(request: PurchaseRequest, http_request: Request):
    """Initiate a purchase with Stripe checkout"""
    try:
        # Get the listing
        listing = await db.marketplace_listings.find_one(
            {"listing_id": request.listing_id, "status": "active"},
            {"_id": 0}
        )
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found or no longer available")
        
        # Prevent buying own listing
        if listing["seller_id"] == request.buyer_id:
            raise HTTPException(status_code=400, detail="Cannot purchase your own listing")
        
        # Calculate platform fee (3%)
        price = float(listing["price"])
        platform_fee = round(price * PLATFORM_FEE_PERCENT, 2)
        
        # Initialize Stripe
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Payment system not configured")
        
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Build success/cancel URLs
        success_url = f"{request.origin_url}/marketplace/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/marketplace"
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=price,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "listing_id": request.listing_id,
                "buyer_id": request.buyer_id,
                "buyer_email": request.buyer_email,
                "seller_id": listing["seller_id"],
                "seller_username": listing["seller_username"],
                "title": listing["title"],
                "platform_fee": str(platform_fee),
                "type": "marketplace_purchase"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create transaction record
        transaction_id = str(uuid.uuid4())
        transaction_doc = {
            "transaction_id": transaction_id,
            "session_id": session.session_id,
            "listing_id": request.listing_id,
            "listing_title": listing["title"],
            "buyer_id": request.buyer_id,
            "buyer_email": request.buyer_email,
            "seller_id": listing["seller_id"],
            "seller_username": listing["seller_username"],
            "amount": price,
            "platform_fee": platform_fee,
            "seller_payout": round(price - platform_fee, 2),
            "currency": "usd",
            "payment_status": "pending",
            "escrow_status": "pending",  # pending, held, released, refunded
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_transactions.insert_one(transaction_doc)
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id,
            "transaction_id": transaction_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating purchase: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/marketplace/payment/status/{session_id}")
async def get_payment_status(session_id: str):
    """Check payment status and update transaction"""
    try:
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        
        # Get status from Stripe
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Get listing details
        listing = await db.marketplace_listings.find_one(
            {"listing_id": transaction.get("listing_id")},
            {"_id": 0, "title": 1, "seller_username": 1, "price": 1}
        )
        
        # Update transaction if payment completed
        if status.payment_status == "paid" and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "escrow_status": "held",  # Money is now in escrow
                        "paid_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Mark listing as sold
            await db.marketplace_listings.update_one(
                {"listing_id": transaction["listing_id"]},
                {"$set": {"status": "sold"}}
            )
        
        return {
            "success": True,
            "status": status.status,
            "payment_status": status.payment_status,
            "escrow_status": "held" if status.payment_status == "paid" else "pending",
            "amount": status.amount_total / 100,  # Convert from cents
            "currency": status.currency,
            "listing_id": transaction.get("listing_id"),
            "listing_title": listing.get("title") if listing else "Item",
            "seller_id": transaction.get("seller_id"),
            "seller_username": listing.get("seller_username") if listing else "Seller",
            "transaction_id": transaction.get("transaction_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/marketplace/confirm-delivery/{transaction_id}")
async def confirm_delivery(transaction_id: str, buyer_id: str):
    """Confirm delivery and release escrow to seller"""
    try:
        transaction = await db.payment_transactions.find_one(
            {"transaction_id": transaction_id, "buyer_id": buyer_id},
            {"_id": 0}
        )
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction["escrow_status"] != "held":
            raise HTTPException(status_code=400, detail="Escrow not available for release")
        
        # Release escrow
        await db.payment_transactions.update_one(
            {"transaction_id": transaction_id},
            {
                "$set": {
                    "escrow_status": "released",
                    "delivered_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"success": True, "message": "Delivery confirmed, payment released to seller"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming delivery: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/marketplace/report")
async def report_listing(request: ReportListingRequest):
    """Report a listing for review"""
    try:
        report_id = str(uuid.uuid4())
        report_doc = {
            "report_id": report_id,
            "listing_id": request.listing_id,
            "reporter_id": request.reporter_id,
            "reason": request.reason,
            "details": request.details,
            "status": "pending",  # pending, reviewed, resolved
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.listing_reports.insert_one(report_doc)
        
        # Add report to listing
        await db.marketplace_listings.update_one(
            {"listing_id": request.listing_id},
            {"$push": {"reports": report_id}}
        )
        
        return {"success": True, "report_id": report_id}
        
    except Exception as e:
        logger.error(f"Error reporting listing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/marketplace/transactions/{user_id}")
async def get_user_transactions(user_id: str):
    """Get all transactions for a user (as buyer or seller)"""
    try:
        transactions = await db.payment_transactions.find(
            {"$or": [{"buyer_id": user_id}, {"seller_id": user_id}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"success": True, "transactions": transactions}
        
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        return {"success": False, "transactions": [], "error": str(e)}


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Handle checkout.session.completed
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "escrow_status": "held",
                        "paid_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Get transaction to mark listing as sold
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                await db.marketplace_listings.update_one(
                    {"listing_id": transaction["listing_id"]},
                    {"$set": {"status": "sold"}}
                )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


# ===========================================
# SUBSCRIPTION / MEMBERSHIP TIER SYSTEM
# ===========================================

# Subscription Plans - Fixed pricing (security: never accept prices from frontend)
SUBSCRIPTION_PLANS = {
    "basic_monthly": {
        "name": "Basic Monthly",
        "tier": "basic",
        "price": 19.99,
        "interval": "month",
        "trial_days": 14,
        "features": ["limited_messages", "online_status", "event_preview"]
    },
    "basic_yearly": {
        "name": "Basic Yearly",
        "tier": "basic", 
        "price": 199.99,  # ~17% discount
        "interval": "year",
        "trial_days": 14,
        "features": ["limited_messages", "online_status", "event_preview"]
    },
    "premium_monthly": {
        "name": "Premium Monthly",
        "tier": "premium",
        "price": 34.99,
        "interval": "month",
        "trial_days": 14,
        "features": ["unlimited_messages", "marketplace", "sasha_ai", "profile_views", "priority_search", "full_events", "add_to_circle"]
    },
    "premium_yearly": {
        "name": "Premium Yearly",
        "tier": "premium",
        "price": 349.99,  # ~17% discount
        "interval": "year",
        "trial_days": 14,
        "features": ["unlimited_messages", "marketplace", "sasha_ai", "profile_views", "priority_search", "full_events", "add_to_circle"]
    },
    "premium_lifetime": {
        "name": "Premium Lifetime",
        "tier": "premium",
        "price": 499.00,
        "interval": "lifetime",
        "trial_days": 0,
        "features": ["unlimited_messages", "marketplace", "sasha_ai", "profile_views", "priority_search", "full_events", "add_to_circle"]
    }
}

# Feature access by tier
TIER_FEATURES = {
    "free": {
        "feed_access": True,
        "online_now_list": True,
        "messages_per_day": 0,
        "marketplace": False,
        "sasha_ai": False,
        "profile_views": False,
        "priority_search": False,
        "events_full_access": False,
        "add_to_circle": False
    },
    "basic": {
        "feed_access": True,
        "online_now_list": True,
        "messages_per_day": 5,
        "marketplace": False,
        "sasha_ai": False,
        "profile_views": False,
        "priority_search": False,
        "events_full_access": False,  # 1 hour preview only
        "add_to_circle": False
    },
    "premium": {
        "feed_access": True,
        "online_now_list": True,
        "messages_per_day": -1,  # Unlimited
        "marketplace": True,
        "sasha_ai": True,
        "profile_views": True,
        "priority_search": True,
        "events_full_access": True,
        "add_to_circle": True
    }
}


class SubscriptionRequest(BaseModel):
    plan_id: str
    user_id: str
    user_email: str
    origin_url: str


class SubscriptionStatusRequest(BaseModel):
    user_id: str


@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {
        "success": True,
        "plans": SUBSCRIPTION_PLANS,
        "tier_features": TIER_FEATURES
    }


@api_router.post("/subscriptions/checkout")
async def create_subscription_checkout(request: SubscriptionRequest, http_request: Request):
    """Create a Stripe checkout session for subscription"""
    try:
        # Validate plan
        if request.plan_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")
        
        plan = SUBSCRIPTION_PLANS[request.plan_id]
        
        # Initialize Stripe
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Payment system not configured")
        
        # Build URLs from frontend origin
        success_url = f"{request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/pricing"
        
        host_url = str(http_request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=float(plan["price"]),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": request.user_id,
                "user_email": request.user_email,
                "plan_id": request.plan_id,
                "tier": plan["tier"],
                "interval": plan["interval"],
                "type": "subscription"
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        logger.info(f"Stripe session created: {session.session_id}")
        
        # Create subscription transaction record
        subscription_id = str(uuid.uuid4())
        try:
            insert_result = await db.subscription_transactions.insert_one({
                "subscription_id": subscription_id,
                "session_id": session.session_id,
                "user_id": request.user_id,
                "user_email": request.user_email,
                "plan_id": request.plan_id,
                "plan_name": plan["name"],
                "tier": plan["tier"],
                "interval": plan["interval"],
                "amount": plan["price"],
                "currency": "usd",
                "payment_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Transaction saved to MongoDB: {insert_result.inserted_id}")
        except Exception as db_error:
            logger.error(f"Failed to save transaction to MongoDB: {str(db_error)}")
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id,
            "subscription_id": subscription_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/subscriptions/status/{session_id}")
async def check_subscription_status(session_id: str):
    """Check subscription payment status and update user tier"""
    try:
        # Get the transaction
        transaction = await db.subscription_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        # Check with Stripe first
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        
        try:
            status = await stripe_checkout.get_checkout_status(session_id)
            logger.info(f"Stripe status for {session_id}: payment_status={status.payment_status}, status={status.status}")
        except Exception as stripe_error:
            logger.error(f"Stripe status check failed: {str(stripe_error)}")
            raise HTTPException(status_code=500, detail="Failed to check payment status")
        
        # If no transaction exists but payment is complete, create one from Stripe metadata
        if not transaction and status.payment_status == "paid":
            logger.info(f"No transaction found but payment is complete - creating recovery record")
            # Extract user_id from metadata if available
            metadata = getattr(status, 'metadata', {}) or {}
            user_id = metadata.get('user_id', '')
            tier = metadata.get('tier', 'premium')
            plan_id = metadata.get('plan_id', 'premium_manual')
            
            if user_id:
                now = datetime.now(timezone.utc)
                # Create subscription directly
                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            "user_id": user_id,
                            "tier": tier,
                            "plan_id": plan_id,
                            "plan_name": f"{tier.capitalize()} Plan",
                            "status": "active",
                            "interval": metadata.get('interval', 'month'),
                            "current_period_start": now.isoformat(),
                            "current_period_end": None,
                            "updated_at": now.isoformat()
                        },
                        "$setOnInsert": {"created_at": now.isoformat()}
                    },
                    upsert=True
                )
                logger.info(f"Created subscription for user {user_id} with tier {tier}")
                
                return {
                    "success": True,
                    "status": "complete",
                    "payment_status": "paid",
                    "tier": tier,
                    "plan_name": f"{tier.capitalize()} Plan"
                }
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Subscription transaction not found")
        
        # If already processed, return cached status
        if transaction["payment_status"] == "paid":
            return {
                "success": True,
                "status": "complete",
                "payment_status": "paid",
                "tier": transaction["tier"],
                "plan_name": transaction["plan_name"]
            }
        
        if status.payment_status == "paid" and transaction["payment_status"] != "paid":
            # Calculate subscription end date
            now = datetime.now(timezone.utc)
            interval = transaction["interval"]
            
            if interval == "month":
                from dateutil.relativedelta import relativedelta
                end_date = now + relativedelta(months=1)
            elif interval == "year":
                from dateutil.relativedelta import relativedelta
                end_date = now + relativedelta(years=1)
            else:  # lifetime
                end_date = None  # Never expires
            
            # Update transaction
            await db.subscription_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "paid_at": now.isoformat(),
                        "subscription_start": now.isoformat(),
                        "subscription_end": end_date.isoformat() if end_date else None
                    }
                }
            )
            
            # Create/Update user subscription record
            await db.subscriptions.update_one(
                {"user_id": transaction["user_id"]},
                {
                    "$set": {
                        "user_id": transaction["user_id"],
                        "tier": transaction["tier"],
                        "plan_id": transaction["plan_id"],
                        "plan_name": transaction["plan_name"],
                        "status": "active",
                        "interval": transaction["interval"],
                        "current_period_start": now.isoformat(),
                        "current_period_end": end_date.isoformat() if end_date else None,
                        "updated_at": now.isoformat()
                    },
                    "$setOnInsert": {
                        "created_at": now.isoformat()
                    }
                },
                upsert=True
            )
        
        return {
            "success": True,
            "status": status.status,
            "payment_status": status.payment_status,
            "tier": transaction["tier"],
            "plan_name": transaction["plan_name"],
            "amount": status.amount_total / 100
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/subscriptions/user/{user_id}")
async def get_user_subscription(user_id: str):
    """Get user's current subscription status"""
    try:
        subscription = await db.subscriptions.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not subscription:
            # Return free tier for users without subscription
            return {
                "success": True,
                "tier": "free",
                "status": "none",
                "features": TIER_FEATURES["free"]
            }
        
        # Check if subscription is expired
        if subscription.get("current_period_end"):
            end_date = datetime.fromisoformat(subscription["current_period_end"])
            if datetime.now(timezone.utc) > end_date:
                # Subscription expired, downgrade to free
                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {"status": "expired", "tier": "free"}}
                )
                return {
                    "success": True,
                    "tier": "free",
                    "status": "expired",
                    "features": TIER_FEATURES["free"],
                    "expired_plan": subscription["plan_name"]
                }
        
        tier = subscription.get("tier", "free")
        return {
            "success": True,
            "tier": tier,
            "status": subscription.get("status", "active"),
            "plan_name": subscription.get("plan_name"),
            "interval": subscription.get("interval"),
            "current_period_end": subscription.get("current_period_end"),
            "features": TIER_FEATURES.get(tier, TIER_FEATURES["free"])
        }
        
    except Exception as e:
        logger.error(f"Error getting user subscription: {str(e)}")
        return {
            "success": False,
            "tier": "free",
            "status": "error",
            "features": TIER_FEATURES["free"]
        }


@api_router.post("/subscriptions/cancel/{user_id}")
async def cancel_subscription(user_id: str):
    """Cancel user's subscription (will remain active until period end)"""
    try:
        result = await db.subscriptions.update_one(
            {"user_id": user_id, "status": "active"},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        return {"success": True, "message": "Subscription cancelled. Access continues until period end."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class AdminSetTierRequest(BaseModel):
    user_id: str
    tier: str  # 'free', 'basic', 'premium'


@api_router.post("/admin/set-tier")
async def admin_set_user_tier(request: AdminSetTierRequest):
    """Admin endpoint to manually set a user's subscription tier (for testing)"""
    try:
        if request.tier not in ['free', 'basic', 'premium']:
            raise HTTPException(status_code=400, detail="Invalid tier. Must be 'free', 'basic', or 'premium'")
        
        now = datetime.now(timezone.utc)
        
        if request.tier == 'free':
            # Delete subscription to make user free
            await db.subscriptions.delete_one({"user_id": request.user_id})
            return {"success": True, "message": f"User {request.user_id} is now on FREE tier"}
        
        # Set subscription
        await db.subscriptions.update_one(
            {"user_id": request.user_id},
            {
                "$set": {
                    "user_id": request.user_id,
                    "tier": request.tier,
                    "plan_id": f"{request.tier}_manual",
                    "plan_name": f"{request.tier.capitalize()} (Manual)",
                    "status": "active",
                    "interval": "lifetime",
                    "current_period_start": now.isoformat(),
                    "current_period_end": None,  # Never expires
                    "updated_at": now.isoformat()
                },
                "$setOnInsert": {
                    "created_at": now.isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "success": True, 
            "message": f"User {request.user_id} is now on {request.tier.upper()} tier",
            "tier": request.tier
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting user tier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class AdminSetFounderRequest(BaseModel):
    user_id: str
    is_founder: bool


@api_router.post("/admin/set-founder")
async def admin_set_founder_status(request: AdminSetFounderRequest):
    """Admin endpoint to set or remove founder status from a user"""
    try:
        # We just return success since Firestore handles the actual user data
        # The frontend will update Firestore directly
        return {
            "success": True,
            "message": f"Founder status {'enabled' if request.is_founder else 'disabled'} for user {request.user_id}",
            "is_founder": request.is_founder
        }
    except Exception as e:
        logger.error(f"Error setting founder status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/subscription-stats")
async def get_subscription_stats():
    """Get subscription statistics for admin dashboard"""
    try:
        # Get all subscriptions
        subscriptions_cursor = db.subscriptions.find({})
        subscriptions = await subscriptions_cursor.to_list(length=None)
        
        # Calculate stats
        total_subscribers = len(subscriptions)
        basic_count = sum(1 for s in subscriptions if s.get('tier') == 'basic')
        premium_count = sum(1 for s in subscriptions if s.get('tier') == 'premium')
        active_count = sum(1 for s in subscriptions if s.get('status') == 'active')
        
        # Get transactions for revenue calculation
        transactions_cursor = db.subscription_transactions.find({"status": "completed"})
        transactions = await transactions_cursor.to_list(length=None)
        
        total_revenue = sum(float(t.get('amount', 0)) for t in transactions)
        
        # Get monthly revenue (current month)
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_transactions = [
            t for t in transactions 
            if t.get('created_at') and datetime.fromisoformat(t['created_at'].replace('Z', '+00:00')) >= month_start
        ]
        monthly_revenue = sum(float(t.get('amount', 0)) for t in monthly_transactions)
        
        return {
            "success": True,
            "stats": {
                "total_subscribers": total_subscribers,
                "basic_subscribers": basic_count,
                "premium_subscribers": premium_count,
                "active_subscriptions": active_count,
                "total_revenue": round(total_revenue, 2),
                "monthly_revenue": round(monthly_revenue, 2),
                "free_users": 0  # This would need Firebase integration to count
            }
        }
    except Exception as e:
        logger.error(f"Error getting subscription stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class AdminUserSearchRequest(BaseModel):
    query: str = ""
    limit: int = 50


@api_router.post("/admin/search-users")
async def admin_search_users(request: AdminUserSearchRequest):
    """Search users for admin management - returns subscription data from MongoDB"""
    try:
        # Get all subscriptions (MongoDB has subscription data)
        subscriptions_cursor = db.subscriptions.find({})
        subscriptions = await subscriptions_cursor.to_list(length=None)
        
        # Create a map of user_id to subscription data
        subscription_map = {}
        for sub in subscriptions:
            user_id = sub.get('user_id')
            if user_id:
                subscription_map[user_id] = {
                    "tier": sub.get('tier', 'free'),
                    "status": sub.get('status', 'none'),
                    "plan_name": sub.get('plan_name', ''),
                    "current_period_end": sub.get('current_period_end')
                }
        
        return {
            "success": True,
            "subscription_map": subscription_map
        }
    except Exception as e:
        logger.error(f"Error searching users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app - MUST be after all routes are defined
app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()