    # AI Agent Payment Platform

[![CI](https://github.com/yourusername/ai-payment-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ai-payment-platform/actions/workflows/ci.yml)
[![Deploy](https://github.com/yourusername/ai-payment-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/ai-payment-platform/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/yourusername/ai-payment-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/ai-payment-platform)

A secure payment platform enabling AI agents to make authorized financial transactions using virtual cards.

## Features

- 🔒 Secure virtual card management
- 📝 Template-based card configuration
- 💰 Spending controls and limits
- 📊 Transaction monitoring
- 🤖 AI agent integration

## Project Structure

```
.
├── backend/           # FastAPI backend
├── frontend/          # React frontend
├── docs/              # Documentation
└── .github/           # GitHub workflows and templates
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- Docker (optional)

### Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
cd backend
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Docker Setup

```bash
# Build and run all services
docker-compose up --build
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Style

We use:
- Black and isort for Python code formatting
- ESLint and Prettier for JavaScript/TypeScript

```bash
# Format Python code
black .
isort .

# Format JavaScript/TypeScript code
npm run format
```

## Deployment

The application is deployed using GitHub Actions to AWS ECS. See the `.github/workflows/deploy.yml` file for details.

## Documentation

- [API Documentation](docs/api/README.md)
- [Frontend Documentation](docs/frontend/README.md)
- [Testing Guide](docs/frontend/testing-guide.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

A secure and scalable payment platform that enables AI agents to make authorized financial transactions using virtual cards.

## Project Overview

This platform provides a robust infrastructure for managing virtual cards, processing transactions, and integrating with AI agents through OpenAI's platform.

### Key Features

- Virtual Card Management
- Agent Authentication & Authorization
- Transaction Controls & Monitoring
- OpenAI Integration
- Real-time Analytics Dashboard
- Comprehensive Security Features

## Technical Stack

### Backend
- Python 3.11+
- FastAPI
- PostgreSQL
- Redis
- Stripe API
- OpenAI API

### Frontend
- React
- TypeScript
- Material-UI
- Redux Toolkit

### Infrastructure
- AWS
- Terraform
- Docker
- Kubernetes

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker
- AWS CLI
- Terraform

### Local Development Setup

1. Clone the repository
```bash
git clone [repository-url]
cd ai-agent-payment-platform
```

2. Install backend dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies
```bash
cd frontend
npm install
```

4. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start development servers
```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

## API Documentation

### Template Management API

The Template Management API provides endpoints for creating and managing card templates. Templates define the rules and settings for virtual cards, enabling consistent card configuration and management.

#### Endpoints

##### Create Template
```http
POST /api/v1/templates
```
Create a new card template with spending limits, merchant restrictions, and control settings.

##### Create Template Version
```http
POST /api/v1/templates/{template_id}/versions
```
Create a new version of an existing template while preserving history.

##### Get Template History
```http
GET /api/v1/templates/{template_id}/history
```
Retrieve the complete version history of a template.

##### Get Template Analytics
```http
GET /api/v1/templates/{template_id}/analytics
```
Get usage statistics and performance metrics for a template.

Query Parameters:
- `time_range`: Number of days to analyze (1-365, default: 30)

##### Get Template
```http
GET /api/v1/templates/{template_id}
```
Retrieve full details of a specific template.

##### List Templates
```http
GET /api/v1/templates
```
List templates with pagination and filtering.

Query Parameters:
- `skip`: Number of templates to skip (>= 0)
- `limit`: Maximum templates to return (1-1000, default: 100)
- `active_only`: Only show active versions (default: true)

### Authentication

All template endpoints require authentication. Include the JWT token in the Authorization header:
```http
Authorization: Bearer <token>
```

### Error Responses

- `404 Not Found`: Template doesn't exist or belongs to another user
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: Invalid request parameters

## Project Structure

```
.
├── backend/                 # Backend service
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core functionality
│   │   ├── db/             # Database models
│   │   └── services/       # External service integrations
│   ├── tests/              # Test suite
│   └── requirements.txt    # Python dependencies
├── frontend/               # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── store/         # State management
│   └── package.json
├── infrastructure/         # Infrastructure as code
│   └── terraform/
├── docs/                  # Documentation
└── README.md
```

## Security

- OAuth 2.0 authentication
- Role-based access control
- API rate limiting
- Encryption for sensitive data
- Comprehensive audit logging

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
