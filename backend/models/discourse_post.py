from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

class DiscoursePost(Base):
    """
    Model for storing Discourse forum posts in the database
    """
    __tablename__ = "cursor_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=True)
    author = Column(String(100), nullable=True)
    content = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    post_id = Column(String(100), nullable=True)
    likes = Column(Integer, nullable=True)
    replies = Column(Integer, nullable=True, default=0)
    views = Column(Integer, nullable=True, default=0)
    category = Column(String(100), nullable=True, default="Unknown")
    sentiment = Column(Float, nullable=True, default=0.0)
    sentiment_label = Column(String(20), nullable=True, default="neutral")
    popular = Column(Boolean, nullable=True, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    scraped_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # New fields for classification
    classifications = Column(JSON, nullable=True)
    primary_classification = Column(String(50), nullable=True, default="neutral")
    classified_at = Column(DateTime, nullable=True)

    def to_dict(self):
        """
        Convert model to dictionary for API responses
        """
        try:
            logger.info(f"Converting DiscoursePost to dict: ID={self.id}, Title={self.title}")
            
            # Corrigir o formato de data para evitar erros com timezones
            created_at_str = None
            scraped_at_str = None
            classified_at_str = None
            
            # Verificar se created_at tem valor
            try:
                if isinstance(self.created_at, datetime.datetime):
                    created_at_str = self.created_at.replace(microsecond=0).isoformat()
                elif isinstance(self.created_at, str):
                    created_at_str = self.created_at
                logger.info(f"Formatted created_at: {created_at_str}")
            except Exception as e:
                logger.error(f"Error formatting created_at: {e}")
            
            # Verificar se scraped_at tem valor
            try:
                if isinstance(self.scraped_at, datetime.datetime):
                    scraped_at_str = self.scraped_at.replace(microsecond=0).isoformat()
                elif isinstance(self.scraped_at, str):
                    scraped_at_str = self.scraped_at
            except Exception as e:
                logger.error(f"Error formatting scraped_at: {e}")
                
            # Format classified_at
            try:
                if isinstance(self.classified_at, datetime.datetime):
                    classified_at_str = self.classified_at.replace(microsecond=0).isoformat()
                elif isinstance(self.classified_at, str):
                    classified_at_str = self.classified_at
            except Exception as e:
                logger.error(f"Error formatting classified_at: {e}")
            
            # Parse classifications
            classifications_list = []
            classifications_value = getattr(self, 'classifications', None)
            if classifications_value is not None:
                if isinstance(classifications_value, list):
                    classifications_list = classifications_value
                elif isinstance(classifications_value, str):
                    try:
                        import json
                        classifications_list = json.loads(classifications_value)
                    except:
                        classifications_list = [classifications_value]
            
            # Get primary classification
            primary_class = getattr(self, 'primary_classification', 'neutral') or 'neutral'
            
            return {
                "id": self.id,
                "post_id": self.post_id,
                "title": self.title,
                "author": self.author,
                "content": self.content,
                "url": self.url,
                "likes": self.likes,
                "replies": self.replies,
                "views": self.views,
                "category": self.category,
                "sentiment": self.sentiment,
                "sentiment_label": self.sentiment_label,
                "popular": self.popular,
                "created_at": created_at_str,
                "scraped_at": scraped_at_str,
                "source": "cursor_forum",
                
                # Add classification fields
                "classifications": classifications_list,
                "primary_classification": primary_class,
                "classified_at": classified_at_str
            }
        except Exception as e:
            logger.error(f"Error converting DiscoursePost to dict: {e}")
            return {
                "error": "Error converting post to dict",
                "source": "cursor_forum"
            } 