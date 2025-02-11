    # Virtual Card Management Platform

A modern platform for managing virtual cards with advanced spending controls, analytics, and budgeting features.

## Features

### Virtual Cards Management
- 💳 Create and manage virtual cards
- 🔒 Set spending limits per card
- 🏢 Assign merchant categories
- ❄️ Freeze/unfreeze cards instantly

### Merchant Controls
- 🏪 Set allowed and blocked merchant categories
- 💰 Configure merchant-specific spending limits
- 🚫 Automatic transaction blocking for unauthorized merchants

### Analytics & Budgeting
- 📊 Real-time spending analytics
- 📈 Spending trends by category and merchant
- 💼 Budget management with custom thresholds
- 🔔 Customizable budget alerts

### Security
- 🔐 Secure authentication
- 👥 Role-based access control
- 📱 OAuth 2.0 support

## Quick Start Guide

### Prerequisites

Make sure you have the following installed on your computer:
1. [Node.js](https://nodejs.org/) (version 18 or higher)
2. [Python](https://www.python.org/) (version 3.11 or higher)

### Starting the Platform

#### Step 1: Start the Backend

Open a terminal/command prompt and run these commands:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a Python virtual environment (first time only)
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 4. Install dependencies (first time only)
pip install -r requirements.txt

# 5. Set up environment variables (first time only)
cp .env.example .env

# 6. Start the backend server
python -m uvicorn src.index:app --reload --port 8000
```

#### Step 2: Start the Frontend

Open a new terminal window and run:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start the frontend development server
npm run dev
```

#### Step 3: Access the Platform

1. Open your web browser
2. Go to `http://localhost:5173`
3. Register a new account or log in

### Project Structure

```
.
├── backend/           # Python backend server
│   ├── src/          # Source code
│   ├── tests/        # Test files
│   └── requirements.txt
│
└── frontend/         # React frontend application
    ├── src/          # Source code
    ├── public/       # Static files
    └── package.json
```

## Development Guide

### Available Scripts

#### Backend
```bash
# Run tests
pytest

# Check code style
black .

# Check imports
isort .
```

#### Frontend
```bash
# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if port 8000 is already in use
   - Verify Python version (3.11+)
   - Make sure all dependencies are installed
   - Check .env configuration

2. **Frontend won't start**
   - Check if port 5173 is already in use
   - Verify Node.js version (18+)
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

3. **Can't log in**
   - Verify backend is running
   - Check browser console for errors
   - Clear browser cache and cookies

### Getting Help

If you encounter any issues:
1. Check the troubleshooting guide above
2. Look for error messages in the terminal
3. Check the browser console (F12) for frontend errors
4. Review the backend logs

## License

MIT License - see LICENSE file for details
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
