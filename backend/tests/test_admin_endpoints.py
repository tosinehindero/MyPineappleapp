"""
Backend API Tests for Admin Dashboard Endpoints
Testing new subscription/tier management and admin user endpoints:
- GET /api/admin/subscription-stats - Subscription statistics
- POST /api/admin/set-tier - Set user subscription tier
- POST /api/admin/set-founder - Set user founder status
- POST /api/admin/search-users - Search users and get subscription data
"""

import pytest
import requests
import os

# Base URL for API testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://marketplace-featured.preview.emergentagent.com').rstrip('/')


class TestHealthCheck:
    """Health check tests to ensure API is running"""
    
    def test_api_root(self):
        """Test root endpoint returns Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"✓ API root endpoint working: {data['message']}")


class TestSubscriptionStats:
    """Tests for GET /api/admin/subscription-stats endpoint"""
    
    def test_subscription_stats_endpoint_exists(self):
        """Test that subscription stats endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/subscription-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Subscription stats endpoint exists and returns 200")
    
    def test_subscription_stats_response_structure(self):
        """Test that subscription stats response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/subscription-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        assert "stats" in data, "Response should have 'stats' field"
        
        stats = data["stats"]
        # Verify all expected fields are present
        expected_fields = [
            "total_subscribers",
            "basic_subscribers", 
            "premium_subscribers",
            "active_subscriptions",
            "total_revenue",
            "monthly_revenue",
            "free_users"
        ]
        
        for field in expected_fields:
            assert field in stats, f"Stats should contain '{field}' field"
            print(f"  ✓ {field}: {stats[field]}")
        
        print("✓ Subscription stats response structure is correct")
    
    def test_subscription_stats_data_types(self):
        """Test that subscription stats values have correct data types"""
        response = requests.get(f"{BASE_URL}/api/admin/subscription-stats")
        data = response.json()
        stats = data["stats"]
        
        # Integer fields
        assert isinstance(stats["total_subscribers"], int), "total_subscribers should be int"
        assert isinstance(stats["basic_subscribers"], int), "basic_subscribers should be int"
        assert isinstance(stats["premium_subscribers"], int), "premium_subscribers should be int"
        assert isinstance(stats["active_subscriptions"], int), "active_subscriptions should be int"
        
        # Float fields (revenue)
        assert isinstance(stats["total_revenue"], (int, float)), "total_revenue should be numeric"
        assert isinstance(stats["monthly_revenue"], (int, float)), "monthly_revenue should be numeric"
        
        print("✓ Subscription stats data types are correct")


class TestSetTierEndpoint:
    """Tests for POST /api/admin/set-tier endpoint"""
    
    def test_set_tier_endpoint_exists(self):
        """Test that set-tier endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "test_user_123", "tier": "premium"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 (success) not 404 or 405
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Set-tier endpoint exists and accepts POST")
    
    def test_set_tier_premium(self):
        """Test setting user tier to premium"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "test_user_for_premium", "tier": "premium"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "message" in data
        assert data["tier"] == "premium"
        assert "PREMIUM" in data["message"].upper()
        print(f"✓ Set tier to premium: {data['message']}")
    
    def test_set_tier_basic(self):
        """Test setting user tier to basic"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "test_user_for_basic", "tier": "basic"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["tier"] == "basic"
        print(f"✓ Set tier to basic: {data['message']}")
    
    def test_set_tier_free(self):
        """Test setting user tier to free"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "test_user_for_free", "tier": "free"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "FREE" in data["message"].upper()
        print(f"✓ Set tier to free: {data['message']}")
    
    def test_set_tier_invalid_tier(self):
        """Test setting invalid tier returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "test_user", "tier": "invalid_tier"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 400 Bad Request for invalid tier
        assert response.status_code == 400, f"Expected 400 for invalid tier, got {response.status_code}"
        print("✓ Invalid tier correctly returns 400")
    
    def test_set_tier_missing_user_id(self):
        """Test set-tier with missing user_id returns 422 validation error"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"tier": "premium"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422 for missing user_id, got {response.status_code}"
        print("✓ Missing user_id correctly returns 422 validation error")
    
    def test_set_tier_missing_tier(self):
        """Test set-tier with missing tier returns 422 validation error"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "test_user"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422 for missing tier, got {response.status_code}"
        print("✓ Missing tier correctly returns 422 validation error")


class TestSetFounderEndpoint:
    """Tests for POST /api/admin/set-founder endpoint"""
    
    def test_set_founder_endpoint_exists(self):
        """Test that set-founder endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-founder",
            json={"user_id": "test_user_123", "is_founder": True},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Set-founder endpoint exists and accepts POST")
    
    def test_set_founder_enable(self):
        """Test enabling founder status"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-founder",
            json={"user_id": "test_user_founder_enable", "is_founder": True},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["is_founder"] == True
        assert "enabled" in data["message"].lower()
        print(f"✓ Enable founder status: {data['message']}")
    
    def test_set_founder_disable(self):
        """Test disabling founder status"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-founder",
            json={"user_id": "test_user_founder_disable", "is_founder": False},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["is_founder"] == False
        assert "disabled" in data["message"].lower()
        print(f"✓ Disable founder status: {data['message']}")
    
    def test_set_founder_missing_user_id(self):
        """Test set-founder with missing user_id returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-founder",
            json={"is_founder": True},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422 for missing user_id, got {response.status_code}"
        print("✓ Missing user_id correctly returns 422 validation error")
    
    def test_set_founder_missing_is_founder(self):
        """Test set-founder with missing is_founder returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/admin/set-founder",
            json={"user_id": "test_user"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422 for missing is_founder, got {response.status_code}"
        print("✓ Missing is_founder correctly returns 422 validation error")


class TestSearchUsersEndpoint:
    """Tests for POST /api/admin/search-users endpoint"""
    
    def test_search_users_endpoint_exists(self):
        """Test that search-users endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/admin/search-users",
            json={"query": "", "limit": 50},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Search-users endpoint exists and accepts POST")
    
    def test_search_users_response_structure(self):
        """Test that search-users response has correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/search-users",
            json={"query": "", "limit": 50},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data, "Response should have 'success' field"
        assert data["success"] == True, "success should be True"
        assert "subscription_map" in data, "Response should have 'subscription_map' field"
        assert isinstance(data["subscription_map"], dict), "subscription_map should be a dict"
        print(f"✓ Search-users response structure is correct (found {len(data['subscription_map'])} subscriptions)")
    
    def test_search_users_with_query(self):
        """Test search-users with search query"""
        response = requests.post(
            f"{BASE_URL}/api/admin/search-users",
            json={"query": "test", "limit": 10},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print("✓ Search-users with query works correctly")
    
    def test_search_users_with_limit(self):
        """Test search-users with custom limit"""
        response = requests.post(
            f"{BASE_URL}/api/admin/search-users",
            json={"query": "", "limit": 5},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print("✓ Search-users with custom limit works correctly")
    
    def test_search_users_empty_body(self):
        """Test search-users with empty body uses defaults"""
        response = requests.post(
            f"{BASE_URL}/api/admin/search-users",
            json={},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200 with defaults, got {response.status_code}"
        
        data = response.json()
        assert data["success"] == True
        print("✓ Search-users with empty body uses defaults correctly")


class TestIntegrationFlow:
    """Integration tests to verify full flow of admin operations"""
    
    def test_set_tier_and_verify_stats(self):
        """Test setting a tier and verifying stats endpoint still works"""
        # First set a tier
        set_response = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": "TEST_integration_user", "tier": "premium"},
            headers={"Content-Type": "application/json"}
        )
        assert set_response.status_code == 200
        
        # Then verify stats endpoint works
        stats_response = requests.get(f"{BASE_URL}/api/admin/subscription-stats")
        assert stats_response.status_code == 200
        
        data = stats_response.json()
        assert data["success"] == True
        print("✓ Integration: Set tier then get stats works correctly")
    
    def test_multiple_tier_changes(self):
        """Test changing the same user's tier multiple times"""
        user_id = "TEST_multi_tier_user"
        
        # Set to premium
        response1 = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": user_id, "tier": "premium"},
            headers={"Content-Type": "application/json"}
        )
        assert response1.status_code == 200
        assert response1.json()["tier"] == "premium"
        
        # Set to basic
        response2 = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": user_id, "tier": "basic"},
            headers={"Content-Type": "application/json"}
        )
        assert response2.status_code == 200
        assert response2.json()["tier"] == "basic"
        
        # Set to free
        response3 = requests.post(
            f"{BASE_URL}/api/admin/set-tier",
            json={"user_id": user_id, "tier": "free"},
            headers={"Content-Type": "application/json"}
        )
        assert response3.status_code == 200
        
        print("✓ Multiple tier changes work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
