import pytest
from unittest.mock import Mock, patch
from src.routes.funding import router
from src.integrations.integrationManager import IntegrationManager
from fastapi.testclient import TestClient
from fastapi import FastAPI

app = FastAPI()
app.include_router(router, prefix="/api/v1/funding")
client = TestClient(app)

@pytest.fixture
def mock_integration_manager():
    with patch('src.routes.funding.IntegrationManager') as mock:
        manager = Mock()
        mock.getInstance.return_value = manager
        yield manager

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test_token"}

def test_get_funding_sources(mock_integration_manager, auth_headers):
    # Setup mock response
    mock_sources = [
        {
            "id": "paypal_1",
            "provider": "paypal",
            "connected": True,
            "name": "PayPal"
        }
    ]
    mock_integration_manager.getFundingSources.return_value = mock_sources

    # Make request
    response = client.get("/api/v1/funding/sources", headers=auth_headers)

    # Assert response
    assert response.status_code == 200
    assert response.json() == mock_sources
    mock_integration_manager.getFundingSources.assert_called_once()

def test_get_funding_sources_unauthorized():
    response = client.get("/api/v1/funding/sources")
    assert response.status_code == 401

def test_connect_funding_source(mock_integration_manager, auth_headers):
    # Setup mock response
    mock_auth_url = {
        "url": "https://oauth.provider.com",
        "state": "test_state"
    }
    mock_integration_manager.getPayPalAuthUrl.return_value = mock_auth_url["url"]

    # Make request
    response = client.post("/api/v1/funding/connect/paypal", headers=auth_headers)

    # Assert response
    assert response.status_code == 200
    assert "url" in response.json()
    assert "state" in response.json()
    mock_integration_manager.getPayPalAuthUrl.assert_called_once()

def test_connect_invalid_provider(auth_headers):
    response = client.post(
        "/api/v1/funding/connect/invalid_provider",
        headers=auth_headers
    )
    assert response.status_code == 400

def test_disconnect_funding_source(mock_integration_manager, auth_headers):
    # Make request
    response = client.delete(
        "/api/v1/funding/sources/paypal_1",
        headers=auth_headers
    )

    # Assert response
    assert response.status_code == 200
    mock_integration_manager.disconnectFundingSource.assert_called_once_with(
        "test_user",
        "paypal_1"
    )

def test_disconnect_unauthorized():
    response = client.delete("/api/v1/funding/sources/paypal_1")
    assert response.status_code == 401

def test_oauth_callback_success(mock_integration_manager, auth_headers):
    # Setup mock
    mock_integration_manager.handlePayPalCallback.return_value = None

    # Make request
    response = client.get(
        "/api/v1/funding/callback/paypal?code=test_code&state=test_state",
        headers=auth_headers
    )

    # Assert response
    assert response.status_code == 200
    mock_integration_manager.handlePayPalCallback.assert_called_once_with(
        "test_code",
        "test_user"
    )

def test_oauth_callback_missing_params(auth_headers):
    response = client.get("/api/v1/funding/callback/paypal", headers=auth_headers)
    assert response.status_code == 400

def test_oauth_callback_invalid_provider(auth_headers):
    response = client.get(
        "/api/v1/funding/callback/invalid?code=test&state=test",
        headers=auth_headers
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_error_handling(mock_integration_manager, auth_headers):
    # Setup mock to raise exception
    mock_integration_manager.getFundingSources.side_effect = Exception("Test error")

    # Make request
    response = client.get("/api/v1/funding/sources", headers=auth_headers)

    # Assert response
    assert response.status_code == 500
    assert "error" in response.json()

def test_rate_limiting():
    # Make multiple requests in quick succession
    responses = [
        client.get("/api/v1/funding/sources", headers={"Authorization": "Bearer test"})
        for _ in range(10)
    ]
    
    # Check if rate limiting is working
    assert any(r.status_code == 429 for r in responses)
