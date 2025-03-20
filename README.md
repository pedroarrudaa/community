# Community Surf: Windsurf AI Monitor

Community Surf is a specialized tool for monitoring and interacting with Reddit discussions related to Windsurf AI (https://windsurfai.org/), an IDE with artificial intelligence capabilities. This project allows users to track mentions, reviews, and comparisons of Windsurf AI across various Reddit communities.

## Features

- Monitoring of Reddit posts mentioning Windsurf AI
- Visualization of posts organized in cards with title, content, and images
- Filtering by subreddit and specific search terms
- Direct links to original Reddit posts
- Text field for composing personalized responses
- Function to copy responses to clipboard

## Monitored Subreddits

The system monitors the following subreddits for relevant discussions:

- r/programming
- r/coding
- r/ArtificialIntelligence
- r/MachineLearning
- r/webdev
- r/javascript
- r/Python
- r/codeium
- r/IDEs
- r/vscode
- r/aitools

## Project Structure

The project is divided into two parts:

1. **Frontend** (React)

   - User interface focused on posts about Windsurf AI
   - Search functionality for specific terms
   - Visualization and interaction with relevant posts

2. **Backend** (Python/Flask)
   - API to fetch Reddit posts related to Windsurf AI
   - Filtering of relevant content

## Requirements

- Node.js (for frontend)
- Python 3.7+ (for backend)
- Internet access to load dependencies

## Setup and Execution

### Frontend (React)

1. Install dependencies:

   ```
   npm install
   ```

2. Start the development server:

   ```
   npm start
   ```

3. Access the application at `http://localhost:3000`

### Backend (Python/Flask)

1. Create and activate a virtual environment:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```
   cd backend
   pip install -r requirements.txt
   ```

3. Configure environment variables:

   ```
   cp .env.example .env
   # Edit the .env file with your Reddit API credentials
   ```

4. Start the server:

   ```
   python app.py
   ```

5. The API will be available at `http://localhost:5000`

## Next Steps

- **Integration with Reddit API**: Get real data about mentions of Windsurf AI
- **Sentiment Analysis**: Classify posts as positive, negative, or neutral
- **Notifications**: Real-time alerts for new mentions of Windsurf AI
- **Automation**: Integration with automation tools to automatically respond to queries about Windsurf AI

## Contribution

This project is in its early stages. Contributions are welcome through pull requests.

## License

ISC

## ChatGPT Integration

This application now supports automatic response generation using the ChatGPT (OpenAI) API. To use this feature, follow the steps below:

1. Create an account on [OpenAI](https://platform.openai.com/) if you don't have one yet.
2. Generate an API key in the [API Keys](https://platform.openai.com/account/api-keys) section.
3. Copy the `.env` file to `.env.local` and replace `your_api_key_here` with your actual API key:

```
REACT_APP_OPENAI_API_KEY=sk-your_api_key_here
```

4. Restart the application.

Now, when you open a post or tweet in the modal, a response will be automatically generated using ChatGPT.

**Security note**: Never share your API key in public repositories or with other users.
