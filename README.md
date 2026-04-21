# ChatGPT Clone - Node.js Express Edition

A comprehensive ChatGPT-like application built with Node.js, Express.js, and GitHub Models API. This project implements a fully-functional conversational AI interface with persistent chat management, multiple AI model support, and modern responsive design.

## Project Overview

This application provides a production-ready implementation of an AI chat interface that integrates with GitHub Models API (Azure OpenAI). The project demonstrates full-stack development practices including backend API design, database management, and responsive frontend development.

The application supports multiple AI models including GPT-4o Mini, GPT-4o, Mistral Large, and Claude 3.5 Sonnet, all accessible through a single unified interface.

## Key Features

CORE FUNCTIONALITY:
- Real-time chat messaging with AI models
- Complete conversation history management
- Multiple chat session support
- Persistent data storage using SQLite
- Message editing and deletion capabilities
- Response regeneration functionality
- Model selection and switching

USER INTERFACE:
- Modern, responsive ChatGPT-like design
- Dark theme with smooth animations
- Mobile-friendly responsive layout
- Real-time message updates
- Intuitive navigation and controls
- Settings panel and statistics dashboard

TECHNICAL FEATURES:
- RESTful API architecture
- SQLite database with proper schema
- Comprehensive error handling
- Git version control integration
- Security best practices implementation
- Scalable project structure

## System Requirements

NODE.JS AND NPM:
- Node.js version 16.0.0 or higher
- npm version 7.0.0 or higher

AUTHENTICATION:
- GitHub Personal Access Token (for API access)
- Token must have 'repo' and 'codespace' scopes

OPTIONAL:
- Git for version control
- Text editor or IDE for code editing
- Web browser for testing (Chrome, Firefox, Edge recommended)

## Installation Guide

STEP 1: CLONE OR DOWNLOAD PROJECT
Open Command Prompt and navigate to your desired directory:

```cmd
cd path/to/your/directory
```

If cloning from GitHub:
```cmd
git clone https://github.com/EsraaShiref/chatgpt-clone.git
cd chatgpt-clone
```

If using downloaded files, navigate to the project directory.

STEP 2: INSTALL DEPENDENCIES
Install all required Node.js packages:

```cmd
npm install
```

This will install:
- express (web framework)
- better-sqlite3 (database)
- axios (HTTP requests)
- dotenv (environment variables)
- cors (cross-origin requests)
- body-parser (request parsing)
- uuid (unique identifiers)

STEP 3: CONFIGURE ENVIRONMENT VARIABLES
Create a .env file in the project root:

```cmd
type nul > .env
```

Add the following configuration:

```
PORT=3000
NODE_ENV=development
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_API_URL=https://models.inference.ai.azure.com
DB_PATH=./database/chat.db
DEFAULT_MODEL=gpt-4o-mini
```

Replace 'your_github_personal_access_token' with your actual GitHub token from https://github.com/settings/tokens

STEP 4: CREATE DATABASE DIRECTORY
```cmd
mkdir database
```

STEP 5: START THE SERVER
For development with auto-reload:
```cmd
npm run dev
```

For production mode:
```cmd
npm start
```

The server will start on http://localhost:3000

STEP 6: VERIFY INSTALLATION
Open your web browser and navigate to:
```
http://localhost:3000
```

You should see the ChatGPT Clone interface. Create a test chat to verify everything works correctly.

## Usage Instructions

CREATING A NEW CHAT:
1. Click the "New Chat" button in the sidebar
2. Enter a chat title
3. The chat will be created and displayed in the sidebar
4. Begin typing messages in the input field

SENDING MESSAGES:
1. Type your message in the input box
2. Press Enter or click the Send button
3. Wait for the AI response (first response may take 10-15 seconds)
4. The conversation will appear in the main chat area

MANAGING MESSAGES:
- Edit: Click the Edit button on a message to modify it
- Delete: Click the Delete button to remove a message and all subsequent messages
- Regenerate: Click the Regenerate button to get a new response from the AI

CHANGING MODELS:
Use the Model dropdown in the header to switch between available AI models:
- GPT-4o Mini (default - fast and efficient)
- GPT-4o (most capable)
- Mistral Large (open source)
- Claude 3.5 Sonnet (Anthropic)

VIEWING STATISTICS:
Click the Statistics button in the sidebar footer to view:
- Total number of chats
- Total number of messages
- Database file size

## Project Structure

ROOT DIRECTORY:
The project follows a clean, organized structure:

```
chatgpt-clone/
|
|-- server.js                    Main Express application entry point
|-- database.js                  SQLite database management and models
|-- package.json                 Project metadata and dependencies
|-- .env                         Environment variables (not in git)
|-- .gitignore                   Git ignore rules
|
|-- routes/                      API route handlers
|   |-- chat.js                  Chat endpoints and message handling
|   |-- models.js                Model and statistics endpoints
|
|-- middleware/                  Express middleware
|   |-- errorHandler.js          Global error handling middleware
|
|-- public/                      Frontend static files
|   |-- index.html               Main HTML template
|   |-- css/
|   |   |-- style.css            Complete styling and theme
|   |-- js/
|       |-- app.js               Client-side logic and API calls
|
|-- database/                    SQLite database directory
    |-- chat.db                  Database file (auto-created)
```

## API Documentation

The application provides a RESTful API for chat management and messaging.

SESSIONS ENDPOINTS:

GET /api/sessions
Returns all chat sessions with metadata
Response: Array of session objects

POST /api/sessions
Creates a new chat session
Request body: { title: string, model: string }
Response: { id, uuid, title, model_used, created_at }

GET /api/sessions/:id
Retrieves a specific session with all messages
Response: Session object with messages array

PUT /api/sessions/:id
Updates session title
Request body: { title: string }
Response: Updated session object

DELETE /api/sessions/:id
Deletes a session and all associated messages
Response: { success: true }

MESSAGES ENDPOINTS:

POST /api/messages
Sends a message and gets AI response
Request body: { sessionId, message, model }
Response: { success, data: { userMessage, assistantMessage, tokensUsed } }

POST /api/messages/stream
Sends message with streaming response
Returns Server-Sent Events stream of response chunks

PUT /api/messages/:id
Edits a user message (removes subsequent messages)
Request body: { content: string }
Response: Updated message object

DELETE /api/messages/:id
Deletes a message and all subsequent messages
Response: { success: true }

POST /api/messages/:id/regenerate
Regenerates the AI response to a user message
Request body: { model: string }
Response: { success, data: newAssistantMessage }

MODELS ENDPOINTS:

GET /api/models
Returns list of available AI models
Response: Array of model objects with details

GET /api/models/:id
Returns details for a specific model
Response: Model object with capabilities and pricing

UTILITIES ENDPOINTS:

GET /api/health
Server health check endpoint
Response: { status, timestamp, uptime }

GET /api/stats
System statistics
Response: { totalSessions, totalMessages, databaseSize }

## Database Schema

The application uses SQLite with three main tables:

SESSIONS TABLE:
Stores chat session metadata

Columns:
- id: INTEGER PRIMARY KEY
- uuid: TEXT UNIQUE
- title: TEXT
- model_used: TEXT (default: 'gpt-4o-mini')
- system_prompt: TEXT
- created_at: DATETIME
- updated_at: DATETIME
- deleted_at: DATETIME

MESSAGES TABLE:
Stores individual messages in conversations

Columns:
- id: INTEGER PRIMARY KEY
- uuid: TEXT UNIQUE
- session_id: INTEGER (foreign key)
- role: TEXT ('user' or 'assistant')
- content: TEXT
- tokens_used: INTEGER
- created_at: DATETIME
- updated_at: DATETIME

FILES TABLE:
Reserved for future file upload functionality

Columns:
- id: INTEGER PRIMARY KEY
- uuid: TEXT UNIQUE
- session_id: INTEGER (foreign key)
- filename: TEXT
- file_type: TEXT
- file_size: INTEGER
- file_path: TEXT
- created_at: DATETIME

## Technologies Used

BACKEND FRAMEWORK:
- Node.js: JavaScript runtime environment
- Express.js: Web application framework

DATABASE:
- SQLite3: Lightweight relational database
- better-sqlite3: Synchronous SQLite3 interface

API INTEGRATION:
- GitHub Models API: AI model access through Azure OpenAI
- Axios: HTTP client for API requests

FRONTEND:
- HTML5: Semantic markup
- CSS3: Styling with CSS variables and animations
- Vanilla JavaScript: Client-side logic without frameworks

DEVELOPMENT TOOLS:
- npm: Package manager
- Nodemon: Auto-restart on file changes
- dotenv: Environment variable management

## GitHub Models API

This project uses GitHub Models API for AI model access. GitHub Models provides free access to several state-of-the-art AI models.

SUPPORTED MODELS:
- GPT-4o Mini: Fast, efficient model for most tasks
- GPT-4o: Most capable model for complex reasoning
- Mistral Large: Open-source alternative
- Claude 3.5 Sonnet: Anthropic's latest model

AUTHENTICATION:
The application authenticates using a GitHub Personal Access Token with the following scopes:
- repo: Repository access
- codespace: Codespace access

TOKEN GENERATION:
1. Visit https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select the required scopes
4. Generate and securely store the token
5. Add token to .env file as GITHUB_TOKEN

## Troubleshooting Guide

ISSUE: "Module not found" error
SOLUTION: Ensure all dependencies are installed
```cmd
npm install
```

ISSUE: "Port 3000 already in use"
SOLUTION: Change the PORT in .env file or kill the process using port 3000
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

ISSUE: "GITHUB_TOKEN is not defined"
SOLUTION: Verify .env file exists and contains valid token, then restart server

ISSUE: "401 Unauthorized" from GitHub API
SOLUTION: Regenerate GitHub token with correct scopes and update .env file

ISSUE: "Database locked" error
SOLUTION: Delete the database and restart
```cmd
del database\chat.db
npm run dev
```

ISSUE: Cannot connect to GitHub Models API
SOLUTION: Verify internet connection and GitHub token validity

## Security Considerations

SENSITIVE DATA:
- Never commit .env file to version control
- Keep GitHub token confidential
- Use .env.example as template for new installations
- Regularly rotate authentication tokens

DATA PROTECTION:
- Database file contains conversation history (keep secure)
- No user authentication implemented (add if needed)
- API requests use secure HTTPS connections
- Input validation prevents injection attacks

BEST PRACTICES:
- Use environment variables for all secrets
- Implement rate limiting for production
- Add user authentication for multi-user setup
- Regular database backups recommended
- Monitor API usage and costs

## Performance Considerations

OPTIMIZATION TECHNIQUES:
- SQLite indexes on frequently queried fields
- Connection pooling for better resource usage
- Gzip compression for response bodies
- Client-side caching of model list
- Lazy loading of chat history

SCALABILITY:
- Current design supports small to medium scale
- For large scale, consider:
  - PostgreSQL instead of SQLite
  - Redis for caching
  - Load balancing
  - Horizontal scaling

## Deployment Options

HEROKU DEPLOYMENT:
```cmd
heroku login
heroku create app-name
heroku config:set GITHUB_TOKEN=your_token
git push heroku main
```

RAILWAY DEPLOYMENT:
```cmd
railway login
railway init
railway up
```

RENDER DEPLOYMENT:
1. Connect GitHub repository
2. Set environment variables
3. Deploy

## Future Enhancements

PLANNED FEATURES:
- User authentication and authorization
- Chat export functionality (PDF, JSON)
- Voice input and text-to-speech
- Image generation capabilities
- Fine-tuning model support
- Conversation sharing
- Team collaboration features
- Advanced analytics dashboard

## Contributing Guidelines

DEVELOPMENT WORKFLOW:
1. Create feature branch from main
2. Implement feature with clean code
3. Test thoroughly
4. Create pull request with description
5. Code review before merge

CODE STANDARDS:
- Consistent indentation (2 spaces)
- Meaningful variable and function names
- Comments for complex logic
- Error handling on all API calls

## License

MIT License - This project is open source and available for personal and commercial use.


## Acknowledgments

This project was developed as a complete implementation of a ChatGPT-like application using Node.js and modern web technologies. Special thanks to:
- GitHub for providing the Models API
- The Node.js and Express.js communities
- OpenAI for API inspiration

## Change Log

VERSION 1.0.0 (Current Release):
- Initial release
- Complete chat functionality
- Multiple model support
- SQLite persistence
- Responsive UI
- GitHub integration

---

LAST UPDATED: April 2026
CURRENT VERSION: 1.0.0
STATUS: Production Ready
