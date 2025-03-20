import requests
import os
import json
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Twitter credentials
load_dotenv()
BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

def fetch_recent_tweets(query="windsurf OR codeium", max_results=25):
    """
    Fetch recent tweets from Twitter API based on a search query
    
    Args:
        query (str): Search term or hashtag (default focuses on Windsurf IDE and Codeium)
        max_results (int): Number of tweets to fetch (max 100)
        
    Returns:
        list: List of tweet objects with relevant data
    """
    if not BEARER_TOKEN:
        logger.error("Twitter Bearer Token not found. Please set TWITTER_BEARER_TOKEN in .env file")
        print("TWITTER_BEARER_TOKEN não configurado no arquivo .env")
        return []
        
    # Define search query focusing on Windsurf IDE, Codeium, and related products
    if query == "windsurf OR codeium":
        query = "(windsurf IDE) OR (windsurf editor) OR codeium OR (codeium extension) OR (codeium AI) OR (codeium plugin)"
    
    url = "https://api.twitter.com/2/tweets/search/recent"
    
    # Define parameters for the API request
    params = {
        "query": query,
        "max_results": max_results,
        "tweet.fields": "author_id,created_at,public_metrics,entities,attachments",
        "user.fields": "username,name,profile_image_url",
        "expansions": "author_id,attachments.media_keys",
        "media.fields": "url,preview_image_url,type"
    }
    
    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}
    
    try:
        # Add 30 seconds timeout and better error handling
        logger.info(f"Fetching tweets for query: {query}")
        print(f"URL da API: {url}")
        print(f"Token Bearer: {BEARER_TOKEN[:10]}...{BEARER_TOKEN[-10:] if BEARER_TOKEN else 'None'}")
        print(f"Parâmetros: {json.dumps(params, indent=2)}")
        
        response = requests.get(url, headers=headers, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            tweets = data.get("data", [])
            
            # Check if we have any tweets
            if not tweets:
                logger.warning(f"No tweets found for query: {query}")
                print("Nenhum tweet encontrado para a consulta. Resposta da API:")
                print(json.dumps(data, indent=2))
                return []
                
            users = {user["id"]: user for user in data.get("includes", {}).get("users", [])}
            
            # Get media items if available
            media_items = {}
            if "includes" in data and "media" in data["includes"]:
                media_items = {media["media_key"]: media for media in data["includes"]["media"]}
            
            # Format the tweets with additional user information
            formatted_tweets = []
            for tweet in tweets:
                author_id = tweet.get("author_id")
                user_info = users.get(author_id, {})
                
                # Get media URL if tweet has image attachments
                media_url = None
                if "attachments" in tweet and "media_keys" in tweet["attachments"]:
                    for media_key in tweet["attachments"]["media_keys"]:
                        media = media_items.get(media_key)
                        if media and media.get("type") == "photo":
                            media_url = media.get("url") or media.get("preview_image_url")
                            break
                        
                # Extract image URLs from entities if available
                if not media_url and "entities" in tweet:
                    # Verificar URLs em entities.urls
                    if "urls" in tweet["entities"]:
                        for url_entity in tweet["entities"]["urls"]:
                            if "images" in url_entity and len(url_entity["images"]) > 0:
                                media_url = url_entity["images"][0].get("url")
                                break
                    
                    # Check for media in entities.media
                    if not media_url and "media" in tweet["entities"]:
                        for media_entity in tweet["entities"]["media"]:
                            if media_entity.get("type") == "photo" or media_entity.get("type") == "image":
                                media_url = media_entity.get("media_url_https") or media_entity.get("media_url")
                                break
                
                # Check extended_entities field
                if not media_url and "extended_entities" in tweet:
                    if "media" in tweet["extended_entities"]:
                        for media_entity in tweet["extended_entities"]["media"]:
                            if media_entity.get("type") == "photo":
                                media_url = media_entity.get("media_url_https") or media_entity.get("media_url")
                                break
                                
                # Get engagement metrics
                public_metrics = tweet.get("public_metrics", {})
                likes = public_metrics.get("like_count", 0)
                retweets = public_metrics.get("retweet_count", 0)
                replies = public_metrics.get("reply_count", 0)
                quotes = public_metrics.get("quote_count", 0)
                
                # Skip tweets with no engagement (no likes, retweets, replies, or quotes)
                total_engagement = likes + retweets + replies + quotes
                if total_engagement < 1:
                    continue
                
                # Calculate relevance score for sorting
                relevance_score = (likes * 1) + (retweets * 2) + (replies * 1.5) + (quotes * 1.5)
                
                # Format and add the tweet
                formatted_tweet = {
                    "id": tweet["id"],
                    "content": tweet.get("text", ""),
                    "author": user_info.get("name", "Unknown"),
                    "username": user_info.get("username", "unknown"),
                    "profile_image": user_info.get("profile_image_url"),
                    "created_at": tweet.get("created_at"),
                    "likes": likes,
                    "retweets": retweets,
                    "replies": replies,
                    "image": media_url,
                    "relevance_score": relevance_score,
                    "url": f"https://twitter.com/{user_info.get('username', 'unknown')}/status/{tweet['id']}"
                }
                
                formatted_tweets.append(formatted_tweet)
            
            # Sort by created_at (most recent first) but with relevance as a secondary factor
            formatted_tweets.sort(key=lambda x: (x.get("created_at", ""), x.get("relevance_score", 0)), reverse=True)
            
            logger.info(f"Successfully processed {len(formatted_tweets)} tweets")
            return formatted_tweets
        else:
            logger.error(f"Twitter API request failed with status code: {response.status_code}")
            print(f"Erro na API do Twitter. Código: {response.status_code}")
            print("Corpo da resposta:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
            return []
    except Exception as e:
        logger.error(f"Error fetching tweets: {str(e)}")
        print(f"Exceção ao buscar tweets: {str(e)}")
        return []

# Testing function
if __name__ == "__main__":
    token_preview = f"{BEARER_TOKEN[:5]}...{BEARER_TOKEN[-5:]}" if BEARER_TOKEN else "None"
    print(f"Testando API do Twitter com BEARER_TOKEN: {token_preview}")
    tweets = fetch_recent_tweets("python programming")
    for i, tweet in enumerate(tweets):
        print(f"\n--- Tweet {i+1} ---")
        print(f"Author: @{tweet['username']} ({tweet['author']})")
        print(f"Content: {tweet['content']}")
        print(f"Likes: {tweet['likes']}, Retweets: {tweet['retweets']}")
        print(f"URL: {tweet['url']}") 