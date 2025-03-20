import os
import sys
import logging
import sqlite3
import datetime
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    # Try to import SQLAlchemy models
    from models.twitter_post import TwitterPost, Base
    from sqlalchemy import create_engine, desc, func, or_
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.declarative import declarative_base
    USING_ORM = True
except ImportError:
    USING_ORM = False
    logger.info("SQLAlchemy models not available, using direct SQLite access")

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'twitter_posts.db')

def setup_database():
    """Set up SQLite database with the required tables."""
    if USING_ORM:
        try:
            # Create database using SQLAlchemy ORM
            engine = create_engine(f"sqlite:///{DB_PATH}")
            Base.metadata.create_all(engine)
            logger.info("Database setup complete using SQLAlchemy ORM.")
            return True
        except Exception as e:
            logger.error(f"Error setting up database with SQLAlchemy: {e}")
            return setup_database_sqlite()
    else:
        return setup_database_sqlite()

def setup_database_sqlite():
    """Set up database using direct SQLite connection."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create TwitterPost table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS twitter_posts (
            id INTEGER PRIMARY KEY,
            external_id TEXT UNIQUE,
            author_id TEXT NOT NULL,
            author TEXT NOT NULL,
            author_name TEXT,
            profile_image TEXT,
            content TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            likes INTEGER DEFAULT 0,
            retweets INTEGER DEFAULT 0,
            replies INTEGER DEFAULT 0,
            url TEXT NOT NULL,
            media_url TEXT,
            subreddit TEXT DEFAULT 'twitter',
            source TEXT DEFAULT 'twitter',
            created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database setup complete using direct SQLite.")
        return True
    except Exception as e:
        logger.error(f"Error setting up database with SQLite: {e}")
        return False

def save_tweets(tweets):
    """Save a list of tweets to the database."""
    if not tweets:
        logger.info("No tweets to save")
        return 0
        
    if USING_ORM:
        return save_tweets_orm(tweets)
    else:
        return save_tweets_sqlite(tweets)

def save_tweets_orm(tweets):
    """Save tweets using SQLAlchemy ORM."""
    try:
        engine = create_engine(f"sqlite:///{DB_PATH}")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        saved_count = 0
        for tweet_data in tweets:
            # Check if tweet already exists
            external_id = tweet_data.get('id')
            if not external_id:
                logger.warning(f"Tweet missing ID, skipping: {tweet_data}")
                continue
                
            existing = session.query(TwitterPost).filter_by(external_id=external_id).first()
            if existing:
                logger.debug(f"Tweet {external_id} already exists, skipping")
                continue
                
            # Map tweet data to TwitterPost attributes
            tweet_obj = TwitterPost(
                external_id=external_id,
                author_id=tweet_data.get('author_id', ''),
                author=tweet_data.get('author', ''),
                author_name=tweet_data.get('author_name', ''),
                profile_image=tweet_data.get('profile_image', ''),
                content=tweet_data.get('content', ''),
                created_at=tweet_data.get('created_at'),
                likes=tweet_data.get('likes', 0),
                retweets=tweet_data.get('retweets', 0),
                replies=tweet_data.get('replies', 0),
                url=tweet_data.get('url', ''),
                media_url=tweet_data.get('media_url', '')
            )
            
            session.add(tweet_obj)
            saved_count += 1
        
        session.commit()
        session.close()
        logger.info(f"Saved {saved_count} tweets to database using ORM")
        return saved_count
    except Exception as e:
        logger.error(f"Error saving tweets with ORM: {e}")
        return save_tweets_sqlite(tweets)

def save_tweets_sqlite(tweets):
    """Save tweets using direct SQLite connection."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        saved_count = 0
        for tweet in tweets:
            # Check if tweet already exists
            external_id = tweet.get('id')
            if not external_id:
                logger.warning(f"Tweet missing ID, skipping: {tweet}")
                continue
                
            cursor.execute("SELECT 1 FROM twitter_posts WHERE external_id = ?", (external_id,))
            if cursor.fetchone():
                logger.debug(f"Tweet {external_id} already exists, skipping")
                continue
                
            # Convert datetime to string if needed
            created_at = tweet.get('created_at')
            if isinstance(created_at, datetime.datetime):
                created_at = created_at.strftime('%Y-%m-%d %H:%M:%S')
            
            # Insert tweet into database
            cursor.execute('''
            INSERT INTO twitter_posts (
                external_id, author_id, author, author_name, profile_image, 
                content, created_at, likes, retweets, replies, url, media_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                external_id,
                tweet.get('author_id', ''),
                tweet.get('author', ''),
                tweet.get('author_name', ''),
                tweet.get('profile_image', ''),
                tweet.get('content', ''),
                created_at,
                tweet.get('likes', 0),
                tweet.get('retweets', 0),
                tweet.get('replies', 0),
                tweet.get('url', ''),
                tweet.get('media_url', '')
            ))
            saved_count += 1
        
        conn.commit()
        conn.close()
        logger.info(f"Saved {saved_count} tweets to database using SQLite")
        return saved_count
    except Exception as e:
        logger.error(f"Error saving tweets with SQLite: {e}")
        return 0

def search_local_tweets(query, limit=20, sort_by='new'):
    """Search for tweets in the local database that match the query."""
    if USING_ORM:
        return search_local_tweets_orm(query, limit, sort_by)
    else:
        return search_local_tweets_sqlite(query, limit, sort_by)

def search_local_tweets_orm(query, limit=20, sort_by='new'):
    """Search for tweets using SQLAlchemy ORM."""
    try:
        engine = create_engine(f"sqlite:///{DB_PATH}")
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Build query
        tweets_query = session.query(TwitterPost)
        
        # Apply search filter if query is provided
        if query:
            tweets_query = tweets_query.filter(TwitterPost.content.like(f"%{query}%"))
        
        # Apply sorting
        if sort_by == 'new':
            tweets_query = tweets_query.order_by(desc(TwitterPost.created_at))
        elif sort_by == 'top':
            tweets_query = tweets_query.order_by(desc(TwitterPost.likes))
        elif sort_by == 'hot':
            # For 'hot', consider a combination of recency and engagement
            # This is a simplified version
            tweets_query = tweets_query.order_by(
                desc((TwitterPost.likes + TwitterPost.retweets) * 0.7 + 
                     func.julianday('now') - func.julianday(TwitterPost.created_at))
            )
        
        # Apply limit
        tweets = tweets_query.limit(limit).all()
        
        # Convert to dictionary
        result = []
        for tweet in tweets:
            tweet_dict = {
                "id": tweet.external_id,
                "author": tweet.author,
                "author_name": tweet.author_name,
                "profile_image": tweet.profile_image,
                "content": tweet.content,
                "created_at": tweet.created_at.isoformat() if tweet.created_at is not None else None,
                "likes": tweet.likes,
                "retweets": tweet.retweets,
                "replies": tweet.replies,
                "url": tweet.url,
                "media_url": tweet.media_url,
                "source": "twitter"
            }
            result.append(tweet_dict)
        
        logger.info(f"Found {len(result)} tweets in database using ORM matching query: '{query}'")
        return result
    except Exception as e:
        logger.error(f"Error searching tweets with ORM: {e}")
        return search_local_tweets_sqlite(query, limit, sort_by)

def search_local_tweets_sqlite(query, limit=20, sort_by='new'):
    """Search for tweets using direct SQLite connection."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Build query
        sql = "SELECT * FROM twitter_posts"
        params = []
        
        # Apply search filter if query is provided
        if query:
            sql += " WHERE content LIKE ?"
            params.append(f"%{query}%")
        
        # Apply sorting
        if sort_by == 'new':
            sql += " ORDER BY created_at DESC"
        elif sort_by == 'top':
            sql += " ORDER BY likes DESC"
        elif sort_by == 'hot':
            # For 'hot', consider a combination of recency and engagement
            sql += " ORDER BY (likes + retweets) * 0.7 + (julianday('now') - julianday(created_at)) DESC"
        
        # Apply limit
        sql += f" LIMIT {int(limit)}"
        
        # Execute query
        cursor.execute(sql, params)
        tweets = cursor.fetchall()
        
        # Convert to dictionary
        result = []
        for tweet in tweets:
            tweet_dict = {
                "id": tweet['external_id'],
                "author": tweet['author'],
                "author_name": tweet['author_name'],
                "profile_image": tweet['profile_image'],
                "content": tweet['content'],
                "created_at": tweet['created_at'],
                "likes": tweet['likes'],
                "retweets": tweet['retweets'],
                "replies": tweet['replies'],
                "url": tweet['url'],
                "media_url": tweet['media_url'],
                "source": "twitter"
            }
            result.append(tweet_dict)
        
        conn.close()
        logger.info(f"Found {len(result)} tweets in database using SQLite matching query: '{query}'")
        return result
    except Exception as e:
        logger.error(f"Error searching tweets with SQLite: {e}")
        return []

def get_all_tweets(limit=50, sort_by='new'):
    """Get all tweets from the database with optional limit and sorting."""
    if USING_ORM:
        return get_all_tweets_orm(limit, sort_by)
    else:
        return get_all_tweets_sqlite(limit, sort_by)

def get_all_tweets_orm(limit=50, sort_by='new'):
    """Get all tweets using SQLAlchemy ORM."""
    try:
        engine = create_engine(f"sqlite:///{DB_PATH}")
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Build query
        tweets_query = session.query(TwitterPost)
        
        # Apply sorting
        if sort_by == 'new':
            tweets_query = tweets_query.order_by(desc(TwitterPost.created_at))
        elif sort_by == 'top':
            tweets_query = tweets_query.order_by(desc(TwitterPost.likes))
        elif sort_by == 'hot':
            tweets_query = tweets_query.order_by(
                desc((TwitterPost.likes + TwitterPost.retweets) * 0.7 + 
                     func.julianday('now') - func.julianday(TwitterPost.created_at))
            )
        
        # Apply limit
        tweets = tweets_query.limit(limit).all()
        
        # Convert to dictionary
        result = []
        for tweet in tweets:
            tweet_dict = {
                "id": tweet.external_id,
                "author": tweet.author,
                "author_name": tweet.author_name,
                "profile_image": tweet.profile_image,
                "content": tweet.content,
                "created_at": tweet.created_at.isoformat() if tweet.created_at is not None else None,
                "likes": tweet.likes,
                "retweets": tweet.retweets,
                "replies": tweet.replies,
                "url": tweet.url,
                "media_url": tweet.media_url,
                "source": "twitter"
            }
            result.append(tweet_dict)
        
        logger.info(f"Retrieved {len(result)} tweets from database using ORM")
        return result
    except Exception as e:
        logger.error(f"Error retrieving tweets with ORM: {e}")
        return get_all_tweets_sqlite(limit, sort_by)

def get_all_tweets_sqlite(limit=50, sort_by='new'):
    """Get all tweets using direct SQLite connection."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Build query
        sql = "SELECT * FROM twitter_posts"
        
        # Apply sorting
        if sort_by == 'new':
            sql += " ORDER BY created_at DESC"
        elif sort_by == 'top':
            sql += " ORDER BY likes DESC"
        elif sort_by == 'hot':
            sql += " ORDER BY (likes + retweets) * 0.7 + (julianday('now') - julianday(created_at)) DESC"
        
        # Apply limit
        sql += f" LIMIT {int(limit)}"
        
        # Execute query
        cursor.execute(sql)
        tweets = cursor.fetchall()
        
        # Convert to dictionary
        result = []
        for tweet in tweets:
            tweet_dict = {
                "id": tweet['external_id'],
                "author": tweet['author'],
                "author_name": tweet['author_name'],
                "profile_image": tweet['profile_image'],
                "content": tweet['content'],
                "created_at": tweet['created_at'],
                "likes": tweet['likes'],
                "retweets": tweet['retweets'],
                "replies": tweet['replies'],
                "url": tweet['url'],
                "media_url": tweet['media_url'],
                "source": "twitter"
            }
            result.append(tweet_dict)
        
        conn.close()
        logger.info(f"Retrieved {len(result)} tweets from database using SQLite")
        return result
    except Exception as e:
        logger.error(f"Error retrieving tweets with SQLite: {e}")
        return []

def get_recent_tweets(limit=20):
    """Get the most recent tweets from the database."""
    return get_all_tweets(limit=limit, sort_by='new')

# Initialize the database when the module is imported
setup_database() 