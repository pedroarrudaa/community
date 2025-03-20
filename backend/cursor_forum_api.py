import requests
import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Base URL for the Cursor forum
DISCOURSE_BASE_URL = "https://forum.cursor.com"

def fetch_latest_topics(page=0, limit=30):
    """
    Fetch latest topics from the Cursor forum using Discourse API
    
    Args:
        page (int): Page number for pagination
        limit (int): Number of topics to fetch
        
    Returns:
        list: List of formatted topic data
    """
    try:
        # Construct the URL for the latest topics
        url = f"{DISCOURSE_BASE_URL}/latest.json"
        params = {"page": page}
        
        logger.info(f"Fetching latest topics from {url}, page {page}")
        
        # Make the request
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            topics = data.get("topic_list", {}).get("topics", [])
            
            logger.info(f"Successfully fetched {len(topics)} topics from Cursor forum")
            
            # Format the topics
            formatted_topics = []
            for topic in topics[:limit]:
                # Check if topic has required fields
                if not all(key in topic for key in ["id", "title"]):
                    continue
                
                # Extract topic data
                topic_id = topic.get("id")
                
                # Determine the URL for the topic
                slug = topic.get("slug", "")
                post_url = f"{DISCOURSE_BASE_URL}/t/{slug}/{topic_id}"
                
                # Get the formatted date
                created_at = topic.get("created_at")
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    created_at = datetime.now()
                
                # Get the topic content and first post by fetching topic details
                content = ""
                try:
                    topic_details = fetch_topic_details(topic_id)
                    if topic_details and topic_details.get("posts") and len(topic_details["posts"]) > 0:
                        first_post = topic_details["posts"][0]
                        content = first_post.get("content", "")
                except Exception as e:
                    logger.warning(f"Error fetching content for topic {topic_id}: {str(e)}")
                
                # Create the formatted topic
                formatted_topic = {
                    "post_id": str(topic_id),
                    "title": topic.get("title", ""),
                    "content": content,  # Now including content
                    "author": topic.get("last_poster_username", ""),
                    "likes": topic.get("like_count", 0),
                    "replies": topic.get("posts_count", 0) - 1,  # Subtract 1 to exclude the first post
                    "views": topic.get("views", 0),
                    "url": post_url,
                    "created_at": created_at,
                    "category": get_category_name(topic.get("category_id")),
                    "popular": topic.get("views", 0) > 100 or topic.get("like_count", 0) > 10,
                }
                
                formatted_topics.append(formatted_topic)
            
            return formatted_topics
        else:
            logger.error(f"Failed to fetch latest topics: {response.status_code}")
            return []
    
    except Exception as e:
        logger.error(f"Error fetching latest topics: {str(e)}")
        return []

def fetch_topic_details(topic_id):
    """
    Fetch details for a specific topic including posts
    
    Args:
        topic_id (int): Topic ID to fetch
        
    Returns:
        dict: Topic details with posts
    """
    try:
        url = f"{DISCOURSE_BASE_URL}/t/{topic_id}.json"
        
        logger.info(f"Fetching topic details for topic {topic_id}")
        
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract topic details
            topic_details = {
                "id": data.get("id"),
                "title": data.get("title"),
                "posts_count": data.get("posts_count"),
                "created_at": data.get("created_at"),
                "views": data.get("views"),
                "posts": []
            }
            
            # Extract posts
            posts = data.get("post_stream", {}).get("posts", [])
            
            for post in posts:
                post_data = {
                    "id": post.get("id"),
                    "username": post.get("username"),
                    "name": post.get("name"),
                    "content": post.get("cooked"),  # HTML content
                    "created_at": post.get("created_at"),
                    "likes": post.get("like_count", 0)
                }
                topic_details["posts"].append(post_data)
            
            return topic_details
        else:
            logger.error(f"Failed to fetch topic details: {response.status_code}")
            return None
    
    except Exception as e:
        logger.error(f"Error fetching topic details: {str(e)}")
        return None

def fetch_categories():
    """
    Fetch categories from the Cursor forum
    
    Returns:
        dict: Dictionary of category IDs to names
    """
    try:
        url = f"{DISCOURSE_BASE_URL}/categories.json"
        
        logger.info(f"Fetching categories from {url}")
        
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            categories = data.get("category_list", {}).get("categories", [])
            
            # Create a dictionary of category IDs to names
            category_dict = {}
            for category in categories:
                category_dict[category.get("id")] = category.get("name")
            
            return category_dict
        else:
            logger.error(f"Failed to fetch categories: {response.status_code}")
            return {}
    
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return {}

# Cache for categories
category_cache = {}

def get_category_name(category_id):
    """
    Get category name from ID, with caching
    
    Args:
        category_id (int): Category ID
        
    Returns:
        str: Category name or "Unknown"
    """
    global category_cache
    
    if not category_cache:
        category_cache = fetch_categories()
    
    return category_cache.get(category_id, "Unknown")

def search_topics(query, page=0, limit=30):
    """
    Search for topics in the Cursor forum
    
    Args:
        query (str): Search query
        page (int): Page number for pagination
        limit (int): Number of topics to fetch
        
    Returns:
        list: List of formatted topic data matching the search
    """
    try:
        url = f"{DISCOURSE_BASE_URL}/search.json"
        params = {
            "q": query,
            "page": page
        }
        
        logger.info(f"Searching for '{query}' at page {page}")
        
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            topics = data.get("topics", [])
            
            logger.info(f"Found {len(topics)} topics matching '{query}'")
            
            # Format the topics
            formatted_topics = []
            for topic in topics[:limit]:
                # Format the created_at date
                created_at = None
                if "created_at" in topic:
                    try:
                        created_at = datetime.fromisoformat(topic["created_at"].replace("Z", "+00:00"))
                    except ValueError:
                        created_at = datetime.utcnow()
                
                # Format the topic data
                topic_data = {
                    "post_id": str(topic.get("id")),
                    "title": topic.get("title", ""),
                    "author": topic.get("last_poster_username", "Unknown"),
                    "content": topic.get("excerpt", ""),
                    "url": f"{DISCOURSE_BASE_URL}/t/{topic.get('slug', '')}/{topic.get('id')}",
                    "replies": topic.get("reply_count", 0),
                    "views": topic.get("views", 0),
                    "likes": topic.get("like_count", 0),
                    "category": get_category_name(topic.get("category_id")),
                    "created_at": created_at,
                    "popular": topic.get("views", 0) > 1000 or topic.get("reply_count", 0) > 20,
                    "sentiment": 0.5,  # Default neutral sentiment
                    "sentiment_label": "neutral"
                }
                
                formatted_topics.append(topic_data)
            
            return formatted_topics
        else:
            logger.error(f"Failed to search for topics: {response.status_code}")
            return []
    
    except Exception as e:
        logger.error(f"Error searching topics: {str(e)}")
        return []

# Testing function
if __name__ == "__main__":
    # Test fetching latest topics
    topics = fetch_latest_topics(limit=5)
    print(f"\nFetched {len(topics)} latest topics:")
    for i, topic in enumerate(topics):
        print(f"\n--- Topic {i+1} ---")
        print(f"Title: {topic['title']}")
        print(f"Author: {topic['author']}")
        print(f"URL: {topic['url']}")
        print(f"Replies: {topic['replies']}, Views: {topic['views']}")
    
    # Test topic details
    if topics:
        first_topic_id = topics[0]["post_id"]
        print(f"\nFetching details for topic ID {first_topic_id}")
        details = fetch_topic_details(first_topic_id)
        if details:
            print(f"Title: {details['title']}")
            print(f"Posts count: {details['posts_count']}")
            print(f"First post by: {details['posts'][0]['username']}") 