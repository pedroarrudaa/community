# Community Surf

## Overview

Community Surf is a comprehensive tool for monitoring and analyzing social media and forum discussions related to technology, programming, and AI tools. The application aggregates content from multiple sources including Reddit forums and Twitter, providing a streamlined interface for filtering, viewing, and interacting with relevant posts.

## Features

- **Multi-source Content Aggregation**: Collect posts from Reddit and Twitter related to programming and AI tools
- **Advanced Filtering**: Filter content by source, category, date, and other metadata
- **Interactive Post Cards**: View and interact with posts in a card-based interface
- **Modal Detail View**: Examine post details in a focused modal interface
- **Content Classification**: AI-powered classification of content by topic and sentiment
- **Response Generation**: Automatically generate response drafts to posts using OpenAI integration
- **Dark/Light Mode**: Toggle between color themes for comfortable viewing

## Tech Stack

### Frontend

- React.js
- Modern JavaScript (ES6+)
- CSS for styling components
- Custom hook-based state management

### Backend

- Python
- Flask web framework
- SQLite database
- SQLAlchemy ORM
- Praw (Python Reddit API Wrapper)
- OpenAI integration for content analysis

## Project Structure

```
community-surf/
├── backend/                # Python backend service
│   ├── models/             # Data models
│   ├── static/             # Static assets for backend
│   ├── templates/          # HTML templates
│   ├── app.py              # Main Flask application
│   ├── cursor_forum_api.py # API for cursor forum interactions
│   ├── twitter_api.py      # Twitter integration
│   └── requirements.txt    # Python dependencies
├── public/                 # Static assets for frontend
├── src/                    # React application
│   ├── app/                # App-wide hooks and state management
│   ├── components/         # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── ...             # Feature-specific components
│   ├── utils/              # Utility functions
│   └── App.js              # Main application component
└── package.json            # Node.js dependencies
```

## Installation

### Prerequisites

- Node.js (v14 or later)
- Python 3.7+
- Git

### Frontend Setup

1. Clone the repository:

   ```
   git clone https://github.com/pedroarrudaa/community.git
   cd community
   ```

2. Install Node.js dependencies:

   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Create and activate a virtual environment:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Configure environment variables (copy .env.example to .env and edit as needed)

5. Start the Flask server:
   ```
   python app.py
   ```

## Usage

1. Access the application at `http://localhost:3000`
2. Use the filter bar to narrow down content by source, category, or keywords
3. Click on post cards to view additional details
4. Toggle between light and dark themes using the theme switcher

## API Endpoints

The backend offers several API endpoints including:

- `/api/posts` - Get all posts
- `/api/twitter` - Get Twitter data
- `/api/forum` - Get forum data
- `/api/classify` - Classify content using AI

## Configuration

### API Keys

To use external services, you'll need to obtain API keys and configure them in your `.env` file:

```
# Twitter API
TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_secret_here

# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret

# OpenAI (for content classification)
OPENAI_API_KEY=your_openai_key
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Acknowledgements

Special thanks to all contributors who have helped make this project possible.
