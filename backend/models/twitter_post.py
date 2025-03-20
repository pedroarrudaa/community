from sqlalchemy import Column, String, Text, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class TwitterPost(Base):
    """
    Model for storing Twitter posts in the database
    """
    __tablename__ = "twitter_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    external_id = Column(String(50), unique=True, nullable=False, index=True)
    author_id = Column(String(50), nullable=False)
    author = Column(String(100), nullable=False)
    author_name = Column(String(150), nullable=True)
    profile_image = Column(String(255), nullable=True)
    media_url = Column(String(255), nullable=True)  # Add new column for tweet media
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    url = Column(String(255), nullable=False)
    likes = Column(Integer, default=0)
    retweets = Column(Integer, default=0)
    replies = Column(Integer, default=0)
    subreddit = Column(String(50), default="twitter")  # For compatibility with existing posts
    source = Column(String(20), default="twitter")     # For compatibility with existing posts

    created = Column(DateTime, default=datetime.datetime.utcnow)
    updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        """
        Convert model to dictionary for API responses
        """
        media_url_value = str(self.media_url) if self.media_url is not None else ""
        profile_image_value = str(self.profile_image) if self.profile_image is not None else ""
       
        image_url = None
        if media_url_value and media_url_value.strip():
            image_url = media_url_value
        elif profile_image_value and profile_image_value.strip():
            image_url = profile_image_value
            
        return {
            "id": self.external_id,
            "author": self.author,
            "author_name": self.author_name,
            "profile_image": self.profile_image,
            "title": f"Post by @{self.author}",  # For compatibility with existing UI
            "content": self.content,
            "created_at": int(self.created_at.timestamp()),  # 
            "url": self.url,
            "score": self.likes,  # Map likes to score for UI compatibility
            "num_comments": self.replies,
            "retweets": self.retweets,      
            "subreddit": "twitter",
            "source": "twitter",
            "image": image_url,  # Use image_url if available, otherwise fallback to profile_image
            "media_url": self.media_url  
        } 