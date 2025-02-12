# AI Agent Payment Platform

A secure and scalable payment platform that enables AI agents to make authorized financial transactions using virtual cards.

## Key Features

- **Virtual Card Management**: Create and manage virtual cards with configurable limits and restrictions
- **OpenAI Integration**: Add payment capabilities to your existing OpenAI assistants
- **LangChain Integration**: Build AI agents with payment capabilities using LangChain
- **Transaction Controls**: Set spending limits, merchant restrictions, and approval workflows
- **Real-time Monitoring**: Track transactions and analyze spending patterns
- **Security Features**: Role-based access control, encryption, and comprehensive audit logging

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd ai-agent-payment-platform
```

2. Install dependencies
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development servers
```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

## Adding Payment Capabilities to Your AI Assistant

1. Create your assistant in the OpenAI dashboard
2. Get your Assistant ID
3. Add a virtual card through our platform:
   - Set spending limits
   - Configure merchant categories
   - Enable transaction controls
4. Start using the make_payment function in your assistant

Example usage:
```python
# Your assistant can now make payments
make_payment({
    "amount": amount,
    "merchant": merchant_name,
    "category": merchant_category,
    "description": transaction_description
})
```

## Security Best Practices

- Set appropriate spending limits
- Use merchant category restrictions
- Enable transaction monitoring
- Implement approval workflows for high-value transactions
- Regularly review activity logs

## Documentation

- [API Documentation](docs/api/README.md)
- [Frontend Documentation](docs/frontend/README.md)
- [Security Guide](docs/security-guide.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
