# Contributing to RunAdvisor

Thank you for your interest in contributing to RunAdvisor! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/RunAdvisor.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit: `git commit -m 'Add your feature'`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Development Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start development
docker-compose up --build
```

## Code Style

- Use ESLint for JavaScript
- Follow React component best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request reviews from maintainers
6. Address review comments

## Reporting Issues

Use GitHub Issues with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)

## Feature Requests

Describe:
- The feature and its benefits
- Use cases
- Proposed implementation (if applicable)
- Related issues or PRs

## Code of Conduct

- Be respectful and inclusive
- No harassment or discrimination
- Provide constructive feedback
- Help others learn and grow

## Questions?

- Open a discussion on GitHub
- Check existing issues/discussions
- Comment on related PRs

---

Happy coding! 🚀
