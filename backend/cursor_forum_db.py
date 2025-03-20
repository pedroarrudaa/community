import logging
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models.discourse_post import DiscoursePost, Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = "sqlite:///cursor_forum.db"
engine = create_engine(DATABASE_URL)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

def init_db():
    """Initialize the database by creating tables if they don't exist"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Cursor Forum database tables created successfully")
    except Exception as e:
        logger.error(f"Error initializing Cursor Forum database: {str(e)}")

def save_topics(topics):
    """
    Save topics to the database
    
    Args:
        topics (list): List of topic dictionaries from the Discourse API
        
    Returns:
        int: Number of new topics saved
    """
    if not topics:
        logger.warning("No topics to save to database")
        return 0
        
    logger.info(f"Attempting to save {len(topics)} topics to database")
    session = SessionLocal()
    new_count = 0
    
    try:
        for topic in topics:
            # Check required fields
            if not topic.get("post_id"):
                logger.warning(f"Topic missing required post_id field: {topic}")
                continue
            
            # Check if topic already exists
            existing = session.query(DiscoursePost).filter_by(post_id=topic["post_id"]).first()
            
            if not existing:
                logger.info(f"Processing new topic: {topic['post_id']}")
                
                # Create datetime object from created_at if it's not already one
                created_at = topic.get("created_at")
                if not isinstance(created_at, datetime.datetime) and created_at is not None:
                    try:
                        if isinstance(created_at, str):
                            created_at = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        else:
                            created_at = datetime.datetime.utcnow()
                    except Exception as e:
                        logger.error(f"Error parsing created_at: {e}")
                        created_at = datetime.datetime.utcnow()
                elif created_at is None:
                    created_at = datetime.datetime.utcnow()
                
                # Create and add the new topic
                topic_data = {
                    "title": topic.get("title", ""),
                    "author": topic.get("author", "Unknown"),
                    "content": topic.get("content", ""),
                    "url": topic.get("url", ""),
                    "post_id": topic.get("post_id", ""),
                    "likes": topic.get("likes"),
                    "replies": topic.get("replies", 0),
                    "views": topic.get("views", 0),
                    "category": topic.get("category", "Unknown"),
                    "sentiment": topic.get("sentiment", 0.5),
                    "sentiment_label": topic.get("sentiment_label", "neutral"),
                    "popular": topic.get("popular", False),
                    "created_at": created_at,
                    "scraped_at": datetime.datetime.utcnow()
                }
                
                try:
                    discourse_post = DiscoursePost(**topic_data)
                    session.add(discourse_post)
                    new_count += 1
                    logger.info(f"Topic {topic['post_id']} added successfully")
                except Exception as e:
                    logger.error(f"Error adding topic {topic.get('post_id')}: {e}")
                    continue
            else:
                # Update existing topic with new data
                existing.views = topic.get("views", existing.views)
                existing.replies = topic.get("replies", existing.replies)
                existing.likes = topic.get("likes", existing.likes)
                existing.popular = topic.get("popular", existing.popular)
                setattr(existing, "scraped_at", datetime.datetime.utcnow())
                logger.info(f"Updated existing topic {topic['post_id']}")
        
        # Commit all changes at once
        if new_count > 0 or len(topics) > 0:
            session.commit()
            logger.info(f"Saved {new_count} new topics to database, updated {len(topics) - new_count}")
        
        return new_count
    
    except Exception as e:
        session.rollback()
        logger.error(f"Error saving topics to database: {str(e)}")
        return 0
    
    finally:
        session.close()

def get_recent_topics(limit=20, offset=0, sort_by='new', category=None, search=None):
    """
    Get recent topics from the database
    
    Args:
        limit (int): Maximum number of topics to return
        offset (int): Number of topics to skip
        sort_by (str): Sort method - 'new', 'top', 'hot'
        category (str): Filter by category
        search (str): Search term for filtering
        
    Returns:
        list: List of topic dictionaries
    """
    session = SessionLocal()
    try:
        logger.info(f"Fetching topics with params: limit={limit}, offset={offset}, sort_by={sort_by}, category={category}, search={search}")
        
        query = session.query(DiscoursePost)
        
        # Apply category filter if provided
        if category and category.lower() != 'all':
            query = query.filter(DiscoursePost.category == category)
            logger.info(f"Applied category filter: {category}")
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (DiscoursePost.title.like(search_term)) | 
                (DiscoursePost.content.like(search_term))
            )
            logger.info(f"Applied search filter: {search}")
        
        # Apply sorting based on the sort_by parameter
        if sort_by == 'top':
            # Sort by number of views (highest first)
            query = query.order_by(DiscoursePost.views.desc())
            logger.info("Sorting by views (top)")
        elif sort_by == 'hot':
            # Sort by a combination of views, replies and recency
            # This is a simple heuristic, can be improved
            from sqlalchemy import desc
            query = query.order_by(
                desc((DiscoursePost.views * 0.5) + (DiscoursePost.replies * 2)),
                DiscoursePost.created_at.desc()
            )
            logger.info("Sorting by hot algorithm")
        else:
            # Default sorting is by date (most recent first)
            query = query.order_by(DiscoursePost.created_at.desc())
            logger.info("Sorting by date (new)")
        
        # Log the SQL query
        logger.info(f"SQL Query: {query}")
        
        # Apply pagination
        topics = query.offset(offset).limit(limit).all()
        logger.info(f"Found {len(topics)} topics in database")
        
        # Log each topic
        for i, topic in enumerate(topics):
            logger.info(f"Topic {i+1}: ID={topic.id}, Title={topic.title}, Created={topic.created_at}")
        
        # Convert to dictionaries
        result = []
        for topic in topics:
            try:
                topic_dict = topic.to_dict()
                result.append(topic_dict)
                logger.info(f"Converted topic {topic.id} to dict: {topic_dict.get('title')}")
            except Exception as e:
                logger.error(f"Error converting topic {topic.id} to dict: {str(e)}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching topics from database: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return []
    
    finally:
        session.close()

def get_topic_count(category=None, search=None):
    """
    Get the total number of topics in the database
    
    Args:
        category (str): Filter by category
        search (str): Search term for filtering
        
    Returns:
        int: Total number of topics
    """
    session = SessionLocal()
    try:
        query = session.query(DiscoursePost)
        
        # Apply category filter if provided
        if category and category.lower() != 'all':
            query = query.filter(DiscoursePost.category == category)
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (DiscoursePost.title.like(search_term)) | 
                (DiscoursePost.content.like(search_term))
            )
        
        return query.count()
    except Exception as e:
        logger.error(f"Error counting topics: {str(e)}")
        return 0
    finally:
        session.close()

def get_topic_categories():
    """
    Get list of categories with post counts
    
    Returns:
        list: List of categories with counts
    """
    session = SessionLocal()
    try:
        from sqlalchemy import func, distinct
        
        # Group by category and count
        categories = session.query(
            DiscoursePost.category,
            func.count(DiscoursePost.id)
        ).group_by(DiscoursePost.category).all()
        
        return [{"name": cat, "count": count} for cat, count in categories]
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        return []
    finally:
        session.close()

def get_topic_by_id(topic_id):
    """
    Get a specific topic by ID
    
    Args:
        topic_id (int): The ID of the topic to fetch
        
    Returns:
        DiscoursePost: The topic with the specified ID, or None if not found
    """
    session = SessionLocal()
    try:
        logger.info(f"Fetching topic with ID: {topic_id}")
        topic = session.query(DiscoursePost).filter(DiscoursePost.id == topic_id).first()
        
        if topic:
            logger.info(f"Found topic: ID={topic.id}, Title={topic.title}")
        else:
            logger.warning(f"No topic found with ID: {topic_id}")
            
        return topic
    except Exception as e:
        logger.error(f"Error fetching topic with ID {topic_id}: {str(e)}")
        return None
    finally:
        session.close()

def get_unclassified_posts(limit=50):
    """
    Get posts that have not been classified yet
    
    Args:
        limit (int): Maximum number of posts to return
        
    Returns:
        list: List of unclassified posts
    """
    session = SessionLocal()
    try:
        logger.info(f"Fetching up to {limit} unclassified posts")
        
        # Find posts where classifications is NULL or classified_at is NULL
        query = session.query(DiscoursePost).filter(
            (DiscoursePost.classifications.is_(None)) | 
            (DiscoursePost.classified_at.is_(None))
        ).order_by(DiscoursePost.created_at.desc()).limit(limit)
        
        posts = query.all()
        logger.info(f"Found {len(posts)} unclassified posts")
        
        # Convert to dictionaries
        result = []
        for post in posts:
            try:
                post_dict = post.to_dict()
                result.append(post_dict)
                logger.info(f"Added unclassified post: ID={post.id}, Title={post.title}")
            except Exception as e:
                logger.error(f"Error converting post {post.id} to dict: {str(e)}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error fetching unclassified posts: {str(e)}")
        return []
    
    finally:
        session.close()

def get_engine():
    """
    Get the SQLAlchemy engine
    
    Returns:
        Engine: The SQLAlchemy engine used by this module
    """
    return engine

# Simple wrapper function to maintain backward compatibility
def get_posts(limit=20):
    """Wrapper function for get_recent_topics to maintain backward compatibility"""
    return get_recent_topics(limit=limit)

# Initialize the database when the module is imported
init_db() 