from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import time
import logging
from dotenv import load_dotenv
import praw
from prawcore.exceptions import RequestException, ResponseException
import threading
import random
from datetime import datetime
import requests
import pandas as pd
from string import Template
import traceback

# Import the scraper
from scraper import scrape_reddit_multiple_subreddits, clean_cache

# Import Twitter modules
import twitter_api
import twitter_db
from models.twitter_post import TwitterPost

# Import Cursor forum modules
import cursor_forum_api
import cursor_forum_db
from models.discourse_post import DiscoursePost

# Test OpenAI availability
try:
    import openai
    print(f"OpenAI package is available, version: {openai.__version__}")
    
    # Test OpenAI initialization with environment variables
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if openai_api_key:
        try:
            # Try setting the API key (different approaches for different versions)
            openai.api_key = openai_api_key
            print("Successfully configured OpenAI with API key from environment")
        except Exception as e:
            print(f"Warning: Could not initialize OpenAI with environment API key: {e}")
    else:
        print("Warning: OPENAI_API_KEY environment variable not set")
except ImportError:
    print("OpenAI package is NOT available. Running without classification capabilities.")
except Exception as e:
    print(f"Error initializing OpenAI: {e}")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import classification module
try:
    from llm_classifier import get_classifier, CATEGORIES
    LLM_CLASSIFIER_AVAILABLE = True
except ImportError:
    logger.warning("LLM classifier module not found. Classification endpoint will not be available.")
    LLM_CLASSIFIER_AVAILABLE = False

# Load environment variables from .env file (if it exists)
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": "*"}})

# Run database schema update
try:
    from update_schema_classifications import add_classification_columns, verify_schema
    
    # Update database schema
    logger.info("Updating database schema for classifications...")
    success = add_classification_columns()
    
    if success:
        logger.info("Database schema update successful")
        verify_schema()
    else:
        logger.error("Failed to update database schema")
except ImportError:
    logger.warning("Could not import update_schema_classifications module. Schema update skipped.")
except Exception as e:
    logger.error(f"Error running database schema update: {e}")

# Set up database
if not os.path.exists('twitter_posts.db'):
    logger.info("Creating new Twitter database")
    twitter_db.setup_database()

# List of subreddits to monitor for Windsurf AI mentions
SUBREDDITS = [
    # General programming communities
    'programming',
    'coding',
    'learnprogramming',
    'MachineLearning',
    'webdev',
    'Python',
    'javascript',
    'codeium',
    'compsci',
    'askprogramming',
    
    # AI and coding assistant specific
    'artificial',
    'AIdev',
    'codingtools',
    'vscode',
    'AIProgramming',
    'AutomateTheBoringStuff',
    'CodeReview',
    'VSCodeExtensions',
    'github',
    'programming_tools',
    
    # New additions for better coverage
    'windsurf',
    'aitools',
    'devtools',
    'codingtips',
    'IDE',
    'opensourcesoftware',
    'programmerhumor',
    'gamedev',
    'learnmachinelearning',
    'datascience',
    
    # Additional tech communities
    'reactjs',
    'node',
    'rust',
    'golang',
    'java',
    'devops',
    'softwareengineering'
]

# List of search terms related to Windsurf AI
SEARCH_TERMS = [
    'windsurf ai', 
    'codeium', 
    'windsurf',  # Added standalone term
    'ai coding assistant',
    'code assistant',
    'ai pair programming',
    'coding ai',
    'code generation',
    'llm code',
    'programming ai',
    'ai programming',
    'github copilot',
    'cursor ai',
    'vscode ai',
    'code completion',
    'ai code',
    'code suggestion',
    'generative ai coding',
    'chatgpt code',
    'language model code',
    'coding assistant',
    # Added more specific terms
    'windsurf coding',
    'codeium assistant',
    'codeium vs copilot',
    'windsurf vs codeium',
    'ai surf',
    'developer tools ai',
    'coding tools'
]

# Rate limiting configuration
RATE_LIMIT_REQUESTS = 60  # Maximum requests per minute
RATE_LIMIT_WINDOW = 60  # Window in seconds (1 minute)
request_timestamps = []

# Enhanced caching mechanism
CACHE = {}
CACHE_TIMEOUT = 600  # Cache timeout in seconds (10 minutes)
CACHE_LAST_UPDATE = 0
CACHE_LOCK = threading.RLock()  # Thread-safe cache access

# Background refresh control
BACKGROUND_REFRESH_ACTIVE = False
BACKGROUND_REFRESH_INTERVAL = 300  # Refresh cache every 5 minutes

# API configurations
API_CACHE_TIMEOUT = 3600  # Cache timeout in seconds (1 hour)
TWITTER_API_ENABLED = bool(os.getenv("TWITTER_BEARER_TOKEN"))

# OpenAI import with try/except - Modified to handle missing package more gracefully
openai = None
client = None
# Try to initialize OpenAI client
try:
    # Try to initialize OpenAI client
    import openai
    # Load OpenAI API key from environment variables
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        openai.api_key = openai_api_key
        logger.info("OpenAI initialized successfully")
    else:
        logger.warning("OpenAI API key not found in environment variables")
except Exception as e:
    logger.error(f"Error initializing OpenAI: {e}")

def check_rate_limit():
    """
    Check if we're within the rate limit and update the request timestamps.
    Returns True if we can make a request, False otherwise.
    """
    global request_timestamps
    current_time = time.time()
    
    # Remove timestamps older than the window
    request_timestamps = [ts for ts in request_timestamps if current_time - ts < RATE_LIMIT_WINDOW]
    
    # Check if we've made too many requests
    if len(request_timestamps) >= RATE_LIMIT_REQUESTS:
        logger.warning(f"Rate limit exceeded: {len(request_timestamps)} requests in the last {RATE_LIMIT_WINDOW} seconds")
        return False
    
    # Add the current timestamp and allow the request
    request_timestamps.append(current_time)
    return True

def generate_cache_key(subreddit, sort_by, time_filter, data_source):
    """Generate a unique cache key based on request parameters"""
    return f"{subreddit or 'all'}:{sort_by}:{time_filter}:{data_source}"

def get_from_cache(cache_key):
    """Get data from cache if valid"""
    with CACHE_LOCK:
        if cache_key in CACHE:
            timestamp, data = CACHE[cache_key]
            if time.time() - timestamp < CACHE_TIMEOUT:
                logger.info(f"Cache hit for {cache_key}")
                return data
    return None

def store_in_cache(cache_key, data):
    """Store data in cache thread-safely"""
    with CACHE_LOCK:
        CACHE[cache_key] = (time.time(), data)
        logger.info(f"Updated cache for {cache_key}")

def clean_local_cache():
    """Remove expired cache entries"""
    with CACHE_LOCK:
        current_time = time.time()
        expired_keys = [k for k, (timestamp, _) in CACHE.items() if current_time - timestamp > CACHE_TIMEOUT]
        for key in expired_keys:
            del CACHE[key]
        
        # Also clean the scraper's cache
        clean_cache()
        
        logger.info(f"Cleaned {len(expired_keys)} expired cache entries")

def background_refresh_cache():
    """Background task to refresh cache periodically"""
    global BACKGROUND_REFRESH_ACTIVE
    
    if BACKGROUND_REFRESH_ACTIVE:
        return
    
    BACKGROUND_REFRESH_ACTIVE = True
    
    try:
        logger.info("Starting background cache refresh")
        
        # Get all existing cache keys
        with CACHE_LOCK:
            cache_keys = list(CACHE.keys())
        
        # Refresh each key
        for key in cache_keys:
            parts = key.split(':')
            if len(parts) < 4:
                continue
                
            subreddit = None if parts[0] == 'all' else parts[0]
            sort_by = parts[1]
            time_filter = parts[2]
            data_source = parts[3]
            
            try:
                logger.info(f"Background refreshing cache for {key}")
                
                if data_source == 'api':
                    posts = fetch_windsurf_ai_posts(subreddit, sort_by, time_filter, background=True)
                elif data_source == 'scraper':
                    posts = fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter, background=True)
                else:
                    continue  # Skip mock data
                
                # Only update if we got actual results
                if posts and len(posts) > 0:
                    store_in_cache(key, posts)
                    
                # Small delay between refreshes
                time.sleep(random.uniform(1, 3))
                
            except Exception as e:
                logger.error(f"Error during background refresh for {key}: {e}")
    
    except Exception as e:
        logger.error(f"Error in background refresh task: {e}")
    
    finally:
        BACKGROUND_REFRESH_ACTIVE = False
        
        # Schedule the next refresh
        threading.Timer(BACKGROUND_REFRESH_INTERVAL, background_refresh_cache).start()

def fetch_windsurf_ai_posts(subreddit=None, sort_by='new', time_filter='all', limit=50, background=False):
    """
    Fetch posts related to Windsurf IDE, Codeium and their extensions from Reddit using PRAW
    
    Args:
        subreddit (str, optional): Specific subreddit to search. If None, searches all monitored subreddits.
        sort_by (str): Sort method - 'hot', 'new', 'top', or 'relevance'
        time_filter (str): Time filter for 'top' sort - 'all', 'day', 'week', 'month', 'year'
        limit (int): Maximum number of posts to fetch per subreddit/search term
        background (bool): Whether this is a background refresh
        
    Returns:
        list: List of formatted posts
    """
    try:
        # Check cache first if not a background task
        if not background:
            cache_key = generate_cache_key(subreddit, sort_by, time_filter, 'api')
            cached_data = get_from_cache(cache_key)
            if cached_data:
                return cached_data
        
        # Check rate limit before making API requests
        if not check_rate_limit():
            logger.warning("Rate limit exceeded. Falling back to web scraping.")
            # Fall back to web scraping
            return fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter, limit, background)
            
        # Reddit API credentials loaded from environment variables
        client_id = os.getenv('REDDIT_CLIENT_ID')
        client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        
        # If credentials are missing, fall back to web scraping
        if not client_id or not client_secret:
            logger.warning("Reddit API credentials missing. Falling back to web scraping.")
            return fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter, limit, background)
        
        # Initialize the Reddit API client
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent="community-surf:v1.0.0 (by u/yourusername)"
        )
        
        # Fetch posts containing relevant terms
        all_posts = []
        
        # Limit the number of API calls to avoid excessive wait times
        max_api_calls = 6 if background else 10
        api_calls = 0
        
        # Define search terms focused on Windsurf IDE and Codeium
        search_terms = [
            "windsurf editor", 
            "windsurf IDE", 
            "codeium", 
            "codeium extension", 
            "codeium plugin", 
            "codeium AI"
        ]
        
        # Define target subreddits focused on programming and code tools
        target_subreddits = [
            "programming", "Python", "javascript", "reactjs", "node",
            "codeium", "vscode", "webdev", "coding", "rust", "golang",
            "java", "AIdev", "AIProgramming", "MachineLearning"
        ]
        
        # If a specific subreddit is provided, use only that one
        if subreddit:
            subreddits_to_search = [subreddit]
        else:
            subreddits_to_search = target_subreddits
            
        # For each subreddit, search for relevant terms
        for current_subreddit in subreddits_to_search:
            if api_calls >= max_api_calls:
                break
                
            sub = reddit.subreddit(current_subreddit)
            
            # Combine all search terms with OR operator for more efficient searching
            combined_search = " OR ".join([f'"{term}"' for term in search_terms])
            
            try:
                # Get the appropriate function based on sort method
                if sort_by == 'hot':
                    posts = sub.search(combined_search, sort='hot', limit=limit)
                elif sort_by == 'new':
                    posts = sub.search(combined_search, sort='new', limit=limit)
                elif sort_by == 'top':
                    posts = sub.search(combined_search, sort='top', time_filter=time_filter, limit=limit)
                else:  # default to relevance
                    posts = sub.search(combined_search, sort='relevance', time_filter=time_filter, limit=limit)
                
                api_calls += 1
                
                # Process the posts
                for post in posts:
                    # Skip posts with no interaction (no score, comments, or awards)
                    if post.score < 1 and post.num_comments < 1:
                        continue
                        
                    # Calculate a relevance score for sorting
                    relevance_score = (post.score * 1) + (post.num_comments * 2)
                    
                    # Format post data
                    post_data = {
                        "id": post.id,
                        "title": post.title,
                        "content": post.selftext[:500] + "..." if len(post.selftext) > 500 else post.selftext,
                        "url": post.url,
                        "permalink": "https://reddit.com" + post.permalink,
                        "created_utc": post.created_utc,
                        "score": post.score,
                        "num_comments": post.num_comments,
                        "subreddit": post.subreddit.display_name,
                        "author": str(post.author) if post.author else "[deleted]",
                        "is_video": post.is_video,
                        "relevance_score": relevance_score,
                        "source": "reddit"
                    }
                    
                    # Add thumbnail if available and not a default one
                    if hasattr(post, 'thumbnail') and post.thumbnail not in ['self', 'default', '']:
                        post_data["image"] = post.thumbnail
                    elif hasattr(post, 'preview') and 'images' in post.preview:
                        post_data["image"] = post.preview['images'][0]['source']['url']
                    else:
                        post_data["image"] = None
                        
                    all_posts.append(post_data)
            except Exception as e:
                logger.error(f"Error searching subreddit {current_subreddit}: {str(e)}")
                continue
                
        # Sort posts by recency first, then by relevance score
        all_posts.sort(key=lambda x: (-x["created_utc"], -x.get("relevance_score", 0)))
        
        # Update cache with the results
        store_in_cache(cache_key, all_posts)
        
        return all_posts
    except RequestException as e:
        logger.error(f"Reddit API request error: {e}")
        return fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter, limit, background)
    except ResponseException as e:
        logger.error(f"Reddit API response error: {e}")
        return fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter, limit, background)
    except Exception as e:
        logger.error(f"General error when fetching posts: {e}")
        logger.exception(e)
        return fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter, limit, background)

def fetch_windsurf_ai_posts_by_scraping(subreddit=None, sort_by='hot', time_filter='all', limit=50, background=False):
    """
    Fetch posts related to Windsurf AI by web scraping (fallback method)
    
    Args:
        subreddit (str, optional): Specific subreddit to search. If None, searches all monitored subreddits.
        sort_by (str): Sort method - 'hot', 'new', 'top', or 'relevance'
        time_filter (str): Time filter for 'top' sort - 'all', 'day', 'week', 'month', 'year'
        limit (int): Maximum number of posts to fetch
        background (bool): Whether this is a background refresh
        
    Returns:
        list: List of formatted posts
    """
    try:
        # Check cache first if not a background task
        if not background:
            cache_key = generate_cache_key(subreddit, sort_by, time_filter, 'scraper')
            cached_data = get_from_cache(cache_key)
            if cached_data:
                return cached_data
                
        # Limit the number of subreddits to search in background mode
        if subreddit:
            # Search a single subreddit
            subreddits_to_search = [subreddit]
        else:
            # Search all monitored subreddits or a limited set for background refresh
            subreddits_to_search = SUBREDDITS[:10] if background else SUBREDDITS
        
        # For background refresh, use fewer search terms
        search_terms = SEARCH_TERMS[:2] if background else SEARCH_TERMS
        
        # Request a smaller limit for background refresh
        scrape_limit = limit // 2 if background else limit
        
        # Call the scraper function
        posts = scrape_reddit_multiple_subreddits(
            subreddits_to_search,
            search_terms,
            sort=sort_by,
            time_filter=time_filter,
            limit=scrape_limit
        )
        
        # Mark the source as scraper
        for post in posts:
            post["source"] = "scraper"
        
        logger.info(f"Successfully scraped {len(posts)} posts via web scraping")
        
        # Cache the results if not a background task
        if not background and posts:
            cache_key = generate_cache_key(subreddit, sort_by, time_filter, 'scraper')
            store_in_cache(cache_key, posts)
            
        return posts
    except Exception as e:
        logger.error(f"Error during web scraping: {e}")
        # If all else fails, return empty list (no more mock data)
        logger.warning("Web scraping failed. Returning empty list.")
        return []

@app.route('/api/posts', methods=['GET'])
def get_posts():
    """Get posts from Reddit related to Windsurf AI"""
    
    subreddit = request.args.get('subreddit', None)
    search_term = request.args.get('search', '').lower()
    sort_by = request.args.get('sort', 'hot')
    time_filter = request.args.get('time', 'all')
    use_mock = request.args.get('mock', 'false').lower() == 'true'
    use_scraper = request.args.get('scraper', 'false').lower() == 'true'
    bypass_cache = request.args.get('refresh', 'false').lower() == 'true'
    
    # Validate sort_by parameter
    valid_sort_options = ['hot', 'new', 'top', 'relevance']
    if sort_by not in valid_sort_options:
        sort_by = 'hot'
    
    # Validate time_filter parameter
    valid_time_filters = ['all', 'day', 'week', 'month', 'year']
    if time_filter not in valid_time_filters:
        time_filter = 'all'
    
    # Create cache key based on data source
    data_source = 'mock' if use_mock else 'scraper' if use_scraper else 'api'
    cache_key = generate_cache_key(subreddit, sort_by, time_filter, data_source)
    
    # Check if we can use cached data
    if not bypass_cache:
        cached_data = get_from_cache(cache_key)
        if cached_data:
            posts = cached_data
            # Trigger a background refresh if the cache is older than half its lifetime
            with CACHE_LOCK:
                if cache_key in CACHE:
                    cache_timestamp = CACHE[cache_key][0]
                    if time.time() - cache_timestamp > CACHE_TIMEOUT / 2:
                        threading.Thread(target=background_refresh_cache).start()
        else:
            posts = get_fresh_posts(subreddit, sort_by, time_filter, use_mock, use_scraper)
    else:
        # Force refresh of data
        posts = get_fresh_posts(subreddit, sort_by, time_filter, use_mock, use_scraper)
    
    # Filter by search term if provided
    if search_term:
        filtered_posts = [
            post for post in posts 
            if search_term in post['title'].lower() or 
               (post['content'] and search_term in post['content'].lower())
        ]
    else:
        filtered_posts = posts
    
    # Return with metadata
    response_data = {
        "posts": filtered_posts,
        "metadata": {
            "total_posts": len(filtered_posts),
            "subreddit": subreddit if subreddit else "all",
            "search_term": search_term if search_term else None,
            "sort": sort_by,
            "time_filter": time_filter,
            "timestamp": time.time(),
            "from_cache": not bypass_cache and get_from_cache(cache_key) is not None,
            "source": data_source
        }
    }
    
    return jsonify(response_data)

def get_fresh_posts(subreddit, sort_by, time_filter, use_mock, use_scraper):
    """Helper function to get fresh (non-cached) posts based on parameters"""
    if use_mock:
        # Return empty list instead of mock data
        logger.info("Mock data requested but returning empty list")
        posts = []
    elif use_scraper:
        # Force use of web scraper
        logger.info("Forcing use of web scraper")
        posts = fetch_windsurf_ai_posts_by_scraping(subreddit, sort_by, time_filter)
    else:
        # Try API first, with fallbacks
        logger.info("Fetching posts from Reddit API with fallbacks")
        posts = fetch_windsurf_ai_posts(subreddit, sort_by, time_filter)
    
    # Store in cache
    data_source = 'mock' if use_mock else 'scraper' if use_scraper else 'api'
    cache_key = generate_cache_key(subreddit, sort_by, time_filter, data_source)
    store_in_cache(cache_key, posts)
    
    return posts

@app.route('/api/subreddits', methods=['GET'])
def get_subreddits():
    """Get list of subreddits to monitor for Windsurf AI mentions"""
    return jsonify(SUBREDDITS)

@app.route('/api/search_terms', methods=['GET'])
def get_search_terms():
    """Get list of search terms related to Windsurf AI"""
    return jsonify(SEARCH_TERMS)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get stats about the API usage"""
    return jsonify({
        "rate_limit": {
            "max_requests": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW,
            "current_requests": len(request_timestamps)
        },
        "cache": {
            "entries": len(CACHE),
            "timeout_seconds": CACHE_TIMEOUT,
            "last_update": datetime.fromtimestamp(CACHE_LAST_UPDATE).isoformat() if CACHE_LAST_UPDATE else None
        },
        "subreddits_count": len(SUBREDDITS),
        "search_terms_count": len(SEARCH_TERMS)
    })

@app.route('/api/clear_cache', methods=['POST'])
def clear_cache():
    """Manually clear the cache (administrative endpoint)"""
    with CACHE_LOCK:
        CACHE.clear()
    clean_local_cache()
    return jsonify({"status": "success", "message": "Cache cleared successfully"})

@app.route('/api/tweets/search', methods=['GET'])
def search_tweets():
    """
    Search tweets from the database
    Parameters:
    - query (str): Search query
    - sort (str): Sort order (new, top, hot)
    Returns:
    - JSON response with tweets
    """
    query = request.args.get('query', '')
    sort_by = request.args.get('sort', 'new')
    
    logger.info(f"Searching tweets for query: '{query}', sort: {sort_by}")
    
    try:
        # Get all tweets from the local database
        all_tweets = twitter_db.get_all_tweets(sort_by=sort_by)
        
        # If we have tweets and a query, filter them
        if all_tweets and query:
            filtered_tweets = [t for t in all_tweets if query.lower() in t.get('content', '').lower()]
            logger.info(f"Found {len(filtered_tweets)} tweets in local database matching query: '{query}'")
            return jsonify({
                "posts": filtered_tweets,
                "source": "local_db",
                "total": len(filtered_tweets)
            })
        
        # If we have tweets and no query, return all
        elif all_tweets and not query:
            logger.info(f"Returning all {len(all_tweets)} tweets from local database")
            return jsonify({
                "posts": all_tweets,
                "source": "local_db",
                "total": len(all_tweets)
            })
    except Exception as e:
        logger.error(f"Error retrieving tweets from local database: {e}")
    
    # If we have a query but no results, return an empty list
    return jsonify({
        "posts": [],
        "source": "local_db",
        "total": 0,
        "message": f"No tweets found for query: '{query}'"
    })

@app.route('/api/tweets/recent', methods=['GET'])
def get_recent_tweets():
    """Get recent tweets"""
    try:
        tweets = twitter_db.get_recent_tweets(limit=20)
        return jsonify({
            "posts": tweets,
            "total": len(tweets)
        })
    except Exception as error:
        logger.error(f"Error retrieving recent tweets: {error}")
        return jsonify({
            "posts": [],
            "total": 0,
            "error": str(error)
        }), 500

@app.route('/api/cursor-forum', methods=['GET'])
def get_cursor_forum_posts():
    """Get posts from the Cursor Forum"""
    try:
        # Get posts from the database
        posts = cursor_forum_db.get_recent_topics(limit=20)
        return jsonify({
            "posts": posts,
            "total": len(posts)
        })
    except Exception as e:
        logger.error(f"Error retrieving Cursor Forum posts: {e}")
        return jsonify({
            "posts": [],
            "total": 0,
            "error": str(e)
        }), 500

@app.route('/api/cursor-forum/topics', methods=['GET'])
def get_cursor_forum_topics():
    """Get topics from the Cursor Forum with filter and sort options"""
    try:
        # Get parameters from request
        sort_by = request.args.get('sort', 'new')
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        search = request.args.get('search')
        category = request.args.get('category')
        refresh = request.args.get('refresh', 'false').lower() == 'true'
        
        # Get topics from the database
        posts = cursor_forum_db.get_recent_topics(
            limit=limit, 
            offset=offset, 
            sort_by=sort_by, 
            category=category, 
            search=search
        )
        
        # Get total count for pagination
        total = cursor_forum_db.get_topic_count(category=category, search=search)
        
        return jsonify({
            "posts": posts,
            "total": total,
            "metadata": {
                "from_cache": not refresh,
                "source": "cursor_forum"
            }
        })
    except Exception as e:
        logger.error(f"Error retrieving Cursor Forum topics: {e}")
        return jsonify({
            "posts": [],
            "total": 0,
            "error": str(e)
        }), 500

@app.route('/api/cursor-forum/post/<post_id>', methods=['GET'])
def get_cursor_forum_post(post_id):
    """
    Get a specific Cursor Forum post
    """
    try:
        # Get the post from the database
        post = DiscoursePost.query.filter_by(post_id=post_id).first()
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
            
        # Return the post content
        return jsonify({
            "post_id": post_id,
            "content": post.content
        })
        
    except Exception as e:
        logger.error(f"Error getting post content: {e}")
        logger.error(f"Error retrieving Cursor Forum post details: {e}")
        return jsonify({
            "error": str(e)
        }), 500

def summarize_text(text, max_words=50):
    """
    Summarize the given text to a maximum of max_words using OpenAI
    """
    # Check if OpenAI is properly configured
    if openai is None:
        logger.warning("OpenAI package not installed")
        return {"error": "OpenAI package not installed. Run 'pip install openai' to enable this feature."}
    
    if client is None:
        logger.warning("OpenAI client not initialized")
        return {"error": "OpenAI not properly configured. Check your API key."}
    
    try:
        # Create a prompt for summarization
        prompt = f"Summarize the following text in {max_words} words or less:\n\n{text}"
        
        # Use OpenAI to generate a summary
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.3
        )
        
        # Extract and return the generated summary
        summary = response.choices[0].message.content
        if summary is not None:
            summary = summary.strip()
        return {"summary": summary}
    
    except Exception as error:
        logger.error(f"Error summarizing text: {error}")
        return {"error": f"Error generating summary: {str(error)}"}

@app.route('/api/cursor-forum/post/<post_id>/summary', methods=['GET'])
def get_cursor_forum_post_summary(post_id):
    """
    Get a summarized version of a specific Cursor Forum post content
    """
    try:
        # First get the post
        post = DiscoursePost.query.filter_by(post_id=post_id).first()
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
            
        # Check if the post has content
        if not post.content or post.content.strip() == "":
            return jsonify({"error": "Post content is empty"}), 404
            
        # Generate summary
        summary_result = summarize_text(post.content)
        
        if "error" in summary_result:
            return jsonify(summary_result), 500
            
        return jsonify({
            "post_id": post_id,
            "summary": summary_result["summary"]
        })
        
    except Exception as e:
        logger.error(f"Error getting post summary: {e}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 500

# Add new classification endpoint
@app.route('/api/classify-posts', methods=['POST'])
def classify_posts():
    """
    Classify posts using LLM
    """
    if not LLM_CLASSIFIER_AVAILABLE:
        return jsonify({
            "error": "LLM classifier is not available",
            "message": "Please install the required packages: pip install openai"
        }), 503
    
    try:
        # Get request parameters
        request_data = request.get_json() or {}
        limit = request_data.get('limit', 100)
        source = request_data.get('source', 'cursor_forum')
        save_to_db = request_data.get('save_to_db', True)
        api_key = request_data.get('api_key', os.environ.get('OPENAI_API_KEY'))
        
        # Validate limit
        try:
            limit = int(limit)
            if limit < 1 or limit > 200:
                limit = 100
        except:
            limit = 100
        
        # Initialize classifier
        classifier = get_classifier(api_key)
        
        if not classifier.is_available():
            return jsonify({
                "error": "LLM classifier initialization failed",
                "message": "Please check your API key and OpenAI package installation"
            }), 503
        
        # Get posts to classify
        posts = []
        if source == 'cursor_forum':
            # Get unclassified Cursor forum posts
            posts = cursor_forum_db.get_unclassified_posts(limit=limit)
            # If no unclassified posts, try getting recent posts for reclassification
            if not posts:
                logger.info("No unclassified posts found, getting recent posts for reclassification")
                posts = cursor_forum_db.get_recent_topics(limit=limit)
            logger.info(f"Retrieved {len(posts)} posts for classification")
        else:
            return jsonify({
                "error": "Invalid source specified",
                "message": f"Source '{source}' is not supported for classification"
            }), 400
        
        if not posts:
            return jsonify({
                "error": "No posts to classify",
                "message": f"No posts found for source '{source}'"
            }), 404
        
        # Classify posts
        logger.info(f"Classifying {len(posts)} posts from {source}...")
        classified_posts = classifier.classify_posts(posts)
        
        # Save classifications to database if requested
        if save_to_db and source == 'cursor_forum':
            logger.info("Saving classifications to database...")
            
            # Create database session
            from sqlalchemy.orm import sessionmaker
            engine = cursor_forum_db.get_engine()
            Session = sessionmaker(bind=engine)
            session = Session()
            
            for post_data in classified_posts:
                post_id = post_data.get('id')
                if not post_id:
                    continue
                
                # Get post from database
                post = session.query(DiscoursePost).filter(DiscoursePost.id == post_id).first()
                if not post:
                    continue
                
                # Update post with classification data
                try:
                    # Use setattr for SQLAlchemy models to avoid linter errors
                    setattr(post, 'classifications', post_data.get('classifications', []))
                    setattr(post, 'primary_classification', post_data.get('primary_classification', 'neutral'))
                    setattr(post, 'classified_at', datetime.utcnow())
                except Exception as e:
                    logger.error(f"Error updating post {post_id}: {e}")
            
            # Commit changes
            try:
                session.commit()
                logger.info("Classifications saved to database")
            except Exception as e:
                session.rollback()
                logger.error(f"Error committing classifications to database: {e}")
            finally:
                session.close()
        
        # Return classified posts
        return jsonify({
            "success": True,
            "message": f"Successfully classified {len(classified_posts)} posts",
            "posts": classified_posts,
            "categories": CATEGORIES
        })
        
    except Exception as e:
        logger.error(f"Error in classify_posts: {e}")
        return jsonify({
            "error": "Failed to classify posts",
            "message": str(e)
        }), 500

# Get classification categories
@app.route('/api/classification-categories', methods=['GET'])
def get_classification_categories():
    """
    Get available classification categories
    """
    if not LLM_CLASSIFIER_AVAILABLE:
        return jsonify({
            "error": "LLM classifier is not available",
            "message": "Please install the required packages: pip install openai"
        }), 503
    
    return jsonify({
        "categories": CATEGORIES
    })

# Get the classification of a specific post
@app.route('/api/cursor-forum/post/<post_id>/classification', methods=['GET'])
def get_post_classification(post_id):
    """
    Get the classification of a specific post
    """
    try:
        # Convert post_id to integer and get the topic
        topic_id = int(post_id)
        post = cursor_forum_db.get_topic_by_id(topic_id)
        
        if not post:
            return jsonify({
                "error": "Post not found",
                "message": f"No post found with ID {post_id}"
            }), 404
        
        post_data = post.to_dict()
        
        # Check if the post has classification data
        classifications = post_data.get('classifications', [])
        primary_classification = post_data.get('primary_classification', 'neutral')
        classified_at = post_data.get('classified_at')
        
        return jsonify({
            "post_id": post_id,
            "classifications": classifications,
            "primary_classification": primary_classification,
            "classified_at": classified_at,
            "categories": CATEGORIES if LLM_CLASSIFIER_AVAILABLE else {}
        })
        
    except Exception as e:
        logger.error(f"Error in get_post_classification: {e}")
        return jsonify({
            "error": "Failed to get post classification",
            "message": str(e)
        }), 500

@app.route('/api/cursor-forum/topics/<topic_id>', methods=['GET'])
def get_cursor_forum_topic(topic_id):
    """
    Get a specific Cursor Forum topic by ID
    """
    try:
        # Get the topic from the database
        topic = cursor_forum_db.get_topic_by_id(topic_id)
        
        if not topic:
            return jsonify({"error": "Topic not found"}), 404
            
        # Convert the SQLAlchemy model to a dictionary
        topic_data = {
            "id": topic.id,
            "post_id": topic.post_id,
            "title": topic.title,
            "author": topic.author,
            "author_avatar": topic.author_avatar,
            "content": topic.content,
            "created_at": topic.created_at.isoformat() if hasattr(topic.created_at, "isoformat") else str(topic.created_at),
            "url": topic.url,
            "views": topic.views,
            "replies": topic.replies,
            "likes": topic.likes,
            "classification": topic.classification,
            "source": "cursor_forum"
        }
        
        return jsonify({
            "post": topic_data
        })
        
    except Exception as e:
        logger.error(f"Error retrieving Cursor Forum topic: {e}")
        return jsonify({
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Initialize the database for Twitter
    twitter_db.setup_database()
    
    # Run the Flask app
    app.run(host="0.0.0.0", port=5001, debug=True) 