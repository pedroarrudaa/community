"""
Reddit Web Scraper Module for Community Surf

This module provides a fallback mechanism for fetching Reddit posts related to Windsurf AI
when the official Reddit API is unavailable or rate-limited.
"""

import requests
from bs4 import BeautifulSoup
import logging
import random
import time
import json
import re
import os
from urllib.parse import quote_plus
from functools import lru_cache
import datetime
import threading

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# List of user agents to rotate through
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0',
]

# Rate limiting variables
REQUEST_TIMESTAMPS = []
MAX_REQUESTS_PER_MINUTE = 25
CURRENT_BACKOFF_TIME = 1.0
MAX_BACKOFF_TIME = 60.0
USER_AGENT_FAILURES = {}
USER_AGENT_LOCKS = {}
for ua in USER_AGENTS:
    USER_AGENT_FAILURES[ua] = 0
    USER_AGENT_LOCKS[ua] = threading.RLock()

# Cache for response data
CACHE = {}
CACHE_TIMEOUT = 10 * 60  # 10 minutes in seconds

def get_best_user_agent():
    """Return the user agent with the least number of failures"""
    return min(USER_AGENT_FAILURES.items(), key=lambda x: x[1])[0]

def track_request():
    """
    Track request timestamps for rate limiting
    Returns True if the request should proceed, False if it should be delayed
    """
    global REQUEST_TIMESTAMPS
    current_time = time.time()
    
    # Remove timestamps older than 1 minute
    REQUEST_TIMESTAMPS = [ts for ts in REQUEST_TIMESTAMPS if current_time - ts < 60]
    
    # Check if we're over the limit
    if len(REQUEST_TIMESTAMPS) >= MAX_REQUESTS_PER_MINUTE:
        return False
    
    # Track this request
    REQUEST_TIMESTAMPS.append(current_time)
    return True

def handle_rate_limiting():
    """Apply exponential backoff if rate limited"""
    global CURRENT_BACKOFF_TIME
    
    # Double the backoff time, but don't exceed the maximum
    CURRENT_BACKOFF_TIME = min(CURRENT_BACKOFF_TIME * 2, MAX_BACKOFF_TIME)
    
    # Sleep for the backoff period
    logger.warning(f"Rate limiting detected. Backing off for {CURRENT_BACKOFF_TIME:.1f} seconds")
    time.sleep(CURRENT_BACKOFF_TIME)

def reset_backoff():
    """Reset the backoff time after successful requests"""
    global CURRENT_BACKOFF_TIME
    CURRENT_BACKOFF_TIME = 1.0

def get_cache_key(subreddit, search_term, sort, time_filter):
    """Generate a cache key for a request"""
    return f"{subreddit}:{search_term}:{sort}:{time_filter}"

def get_from_cache(cache_key):
    """Get data from cache if valid"""
    if cache_key in CACHE:
        timestamp, data = CACHE[cache_key]
        if time.time() - timestamp < CACHE_TIMEOUT:
            logger.info(f"Cache hit for {cache_key}")
            return data
    return None

def store_in_cache(cache_key, data):
    """Store data in cache"""
    CACHE[cache_key] = (time.time(), data)

@lru_cache(maxsize=32)
def scrape_reddit_subreddit(subreddit, search_term, sort='hot', time_filter='all', limit=25):
    """
    Scrape posts from a specific subreddit with a search term
    
    Args:
        subreddit (str): The subreddit to scrape
        search_term (str): The term to search for
        sort (str): Sort method - 'hot', 'new', 'top', or 'relevance'
        time_filter (str): Time filter for 'top' sort - 'all', 'day', 'week', 'month', 'year'
        limit (int): Maximum number of posts to fetch
        
    Returns:
        list: List of formatted posts
    """
    logger.info(f"Scraping r/{subreddit} for term '{search_term}' (sort: {sort}, time: {time_filter})")
    
    # Check cache first
    cache_key = get_cache_key(subreddit, search_term, sort, time_filter)
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data
    
    # Apply rate limiting
    if not track_request():
        handle_rate_limiting()
        # Try again after backoff
        return scrape_reddit_subreddit(subreddit, search_term, sort, time_filter, limit)
    
    # Format the search URL
    encoded_search = quote_plus(search_term)
    base_url = f"https://old.reddit.com/r/{subreddit}/search"
    url = f"{base_url}?q={encoded_search}&restrict_sr=on&sort={sort}&t={time_filter}"
    
    logger.info(f"Search URL: {url}")
    
    # Select the best user agent based on previous success rates
    user_agent = get_best_user_agent()
    
    # Lock this user agent while in use
    with USER_AGENT_LOCKS[user_agent]:
        headers = {
            'User-Agent': user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
        }
        
        try:
            logger.info(f"Sending request to Reddit with User-Agent: {headers['User-Agent']}")
            
            # Add a small random delay to avoid patterns
            time.sleep(random.uniform(0.2, 0.5))
            
            response = requests.get(url, headers=headers, timeout=10)
            
            # Check status code first
            if response.status_code == 429:
                # Rate limited - increase failure count for this user agent
                USER_AGENT_FAILURES[user_agent] += 5
                handle_rate_limiting()
                return scrape_reddit_subreddit(subreddit, search_term, sort, time_filter, limit)
                
            elif response.status_code != 200:
                logger.error(f"HTTP Error: {response.status_code} - {response.reason}")
                logger.error(f"Response content: {response.text[:500]}...")
                USER_AGENT_FAILURES[user_agent] += 1
                response.raise_for_status()
            
            # Reset backoff on success
            reset_backoff()
            
            # Decrease failure count for successful user agent (but not below 0)
            USER_AGENT_FAILURES[user_agent] = max(0, USER_AGENT_FAILURES[user_agent] - 1)
            
            logger.info(f"Received response from Reddit (status: {response.status_code}, content length: {len(response.text)} bytes)")
            
            # Parse the HTML
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Find all post divs
            posts = soup.find_all('div', class_='thing')
            logger.info(f"Found {len(posts)} posts in the HTML response")
            
            # Limit the number of posts
            posts = posts[:limit]
            
            # Extract post information
            formatted_posts = []
            for post in posts:
                try:
                    # Extract post ID
                    post_id = post.get('data-fullname', '').replace('t3_', '')
                    
                    # Skip if no valid ID
                    if not post_id:
                        continue
                    
                    # Extract title
                    title_elem = post.find('a', class_='title')
                    title = title_elem.text.strip() if title_elem else 'No title'
                    
                    # Extract permalink
                    permalink = title_elem.get('href', '') if title_elem else ''
                    if permalink.startswith('/r/'):
                        permalink = permalink
                    elif permalink.startswith('http'):
                        # Extract the Reddit part of external links
                        if 'reddit.com' in permalink:
                            permalink = permalink.split('reddit.com')[1]
                        else:
                            # This is an external link, construct a permalink from post ID
                            permalink = f"/r/{subreddit}/comments/{post_id}/"
                    
                    # Extract score
                    score_elem = post.find('div', class_='score unvoted')
                    score = int(score_elem.get('title', '0')) if score_elem and score_elem.get('title', '').isdigit() else 0
                    
                    # Extract post content
                    # Note: Full content isn't available on search results page, just a preview
                    content_elem = post.find('a', class_='search-link')
                    content_preview = ''
                    
                    # Try to get content from the search snippet
                    if not content_preview:
                        snippet_elem = post.find('div', class_='search-result-snippet')
                        if snippet_elem:
                            content_preview = snippet_elem.text.strip()
                    
                    # Extract image if present
                    thumbnail_elem = post.find('a', class_='thumbnail')
                    image_url = None
                    if thumbnail_elem:
                        img = thumbnail_elem.find('img')
                        if img and 'src' in img.attrs and not img['src'].endswith('self'):
                            image_url = img['src']
                            # Convert thumbnails to full images if possible
                            if 'thumbnail' in image_url:
                                image_url = image_url.replace('thumbnail', 'preview')
                    
                    # Author information
                    author_elem = post.find('a', class_='author')
                    author = author_elem.text.strip() if author_elem else '[deleted]'
                    
                    # Comments count
                    comments_elem = post.find('a', class_='comments')
                    comments_text = comments_elem.text.strip() if comments_elem else '0 comments'
                    
                    # Use uma única chamada para re.search e verifique o resultado
                    search_result = re.search(r'(\d+)', comments_text)
                    num_comments = int(search_result.group(1)) if search_result else 0
                    
                    # Create the post object
                    post_data = {
                        "id": post_id,
                        "title": title,
                        "content": content_preview,
                        "subreddit": subreddit,
                        "url": f"https://reddit.com{permalink}",
                        "image": image_url,
                        "score": score,
                        "num_comments": num_comments,
                        "created_utc": int(time.time()),  # Use current time as fallback
                        "author": author
                    }
                    
                    formatted_posts.append(post_data)
                    
                except Exception as e:
                    logger.error(f"Error parsing post: {e}")
            
            logger.info(f"Scraped {len(formatted_posts)} posts from r/{subreddit}")
            
            # Store in cache
            store_in_cache(cache_key, formatted_posts)
            
            return formatted_posts
            
        except requests.exceptions.RequestException as e:
            USER_AGENT_FAILURES[user_agent] += 3
            logger.error(f"Request error when scraping r/{subreddit}: {e}")
            return []
        except Exception as e:
            USER_AGENT_FAILURES[user_agent] += 1
            logger.error(f"General error when scraping r/{subreddit}: {e}")
            return []

def scrape_reddit_multiple_subreddits(subreddits, search_terms, sort='hot', time_filter='all', limit=5):
    """
    Scrape posts from multiple subreddits with multiple search terms
    
    Args:
        subreddits (list): List of subreddits to scrape
        search_terms (list): List of terms to search for
        sort (str): Sort method - 'hot', 'new', 'top', or 'relevance'
        time_filter (str): Time filter for 'top' sort - 'all', 'day', 'week', 'month', 'year'
        limit (int): Maximum number of posts to fetch per subreddit and search term
        
    Returns:
        list: List of formatted posts
    """
    # Define a combined cache key for the entire operation
    cache_key = f"multiple:{','.join(subreddits)}:{','.join(search_terms)}:{sort}:{time_filter}:{limit}"
    
    # Check cache first
    cached_data = get_from_cache(cache_key)
    if cached_data:
        return cached_data
        
    all_posts = []
    
    # Prioritize the most relevant combinations
    combinations = []
    for term in search_terms:
        for subreddit in subreddits:
            combinations.append((subreddit, term))
    
    # Sort combinations by potential relevance (can be customized)
    # For now, just shuffle to distribute load
    random.shuffle(combinations)
    
    # Calculate posts per subreddit and search term
    # Limit the total number of combinations to prevent too many requests
    max_combinations = min(len(combinations), 10)
    selected_combinations = combinations[:max_combinations]
    
    for subreddit, term in selected_combinations:
        try:
            posts = scrape_reddit_subreddit(
                subreddit, 
                term, 
                sort=sort, 
                time_filter=time_filter, 
                limit=limit
            )
            
            if posts:
                # Only add posts with some interaction
                posts_with_interaction = [
                    post for post in posts 
                    if post.get('score', 0) > 0 or post.get('num_comments', 0) > 0
                ]
                
                # Calculate a relevance score for each post
                for post in posts_with_interaction:
                    post['relevance_score'] = (post.get('score', 0) * 1) + (post.get('num_comments', 0) * 2)
                
                all_posts.extend(posts_with_interaction)
        except Exception as e:
            logger.error(f"Error in multiple subreddit scraping for {subreddit}/{term}: {e}")
    
    # Sort posts by recency, then relevance
    all_posts.sort(key=lambda x: (-x["created_utc"], -x.get("relevance_score", 0)))
    
    # Store in cache
    store_in_cache(cache_key, all_posts)
    
    return all_posts

def fetch_windsurf_ai_posts_by_scraping(subreddit=None, sort_by='new', time_filter='all', limit=25, background=False):
    """
    Fetch posts related to Windsurf IDE, Codeium and extensions using web scraping
    
    Args:
        subreddit (str, optional): Specific subreddit to search
        sort_by (str): Sort method
        time_filter (str): Time filter for 'top' sort
        limit (int): Maximum number of posts to fetch
        background (bool): Whether this is running in background
        
    Returns:
        list: List of formatted posts
    """
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
        
    # Check if there's an existing cache for this request
    cache_key = f"scraper:{subreddit or 'all'}:{sort_by}:{time_filter}:{limit}"
    cached_data = get_from_cache(cache_key)
    if cached_data and not background:
        return cached_data
    
    # Fetch the posts
    posts = scrape_reddit_multiple_subreddits(
        subreddits_to_search, 
        search_terms, 
        sort=sort_by, 
        time_filter=time_filter, 
        limit=limit
    )
    
    # Cache the results
    store_in_cache(cache_key, posts)
    
    return posts

# Clean expired cache entries periodically
def clean_cache():
    """Remove expired cache entries"""
    current_time = time.time()
    expired_keys = [k for k, (timestamp, _) in CACHE.items() if current_time - timestamp > CACHE_TIMEOUT]
    for key in expired_keys:
        del CACHE[key]
    logger.info(f"Cleaned {len(expired_keys)} expired cache entries")

# Example usage
if __name__ == "__main__":
    # Test the scraper
    search_terms = ['windsurf ai', 'windsurfai', 'codeium']
    subreddits = ['programming', 'coding', 'webdev']
    
    posts = scrape_reddit_multiple_subreddits(subreddits, search_terms)
    
    # Print sample results
    for i, post in enumerate(posts[:5]):
        print(f"\nPost {i+1}: {post['title']}")
        print(f"Subreddit: r/{post['subreddit']}")
        print(f"Score: {post['score']}, Comments: {post['num_comments']}")
        print(f"URL: {post['url']}")
        print(f"Content preview: {post['content'][:100]}...") 