import logging
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from models.discourse_post import DiscoursePost

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_classification_columns():
    """
    Update the database schema to add new classification columns
    """
    logger.info("Updating database schema with classification columns...")
    
    try:
        # Direct SQLite approach for adding columns
        conn = sqlite3.connect('cursor_forum.db')
        cursor = conn.cursor()
        
        # Check if classifications column exists
        cursor.execute("PRAGMA table_info(cursor_posts)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # Add classifications column if it doesn't exist
        if 'classifications' not in column_names:
            logger.info("Adding classifications column...")
            cursor.execute("ALTER TABLE cursor_posts ADD COLUMN classifications TEXT")
        
        # Add primary_classification column if it doesn't exist
        if 'primary_classification' not in column_names:
            logger.info("Adding primary_classification column...")
            cursor.execute("ALTER TABLE cursor_posts ADD COLUMN primary_classification TEXT DEFAULT 'neutral'")
        
        # Add classified_at column if it doesn't exist
        if 'classified_at' not in column_names:
            logger.info("Adding classified_at column...")
            cursor.execute("ALTER TABLE cursor_posts ADD COLUMN classified_at TIMESTAMP")
        
        conn.commit()
        conn.close()
        
        logger.info("Database schema updated successfully")
        return True
    
    except Exception as e:
        logger.error(f"Error updating database schema: {e}")
        return False

def verify_schema():
    """
    Verify that the new columns exist in the database
    """
    logger.info("Verifying database schema...")
    
    try:
        # Connect to database
        engine = create_engine('sqlite:///cursor_forum.db')
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Get table schema
        sample_post = session.query(DiscoursePost).first()
        if sample_post:
            logger.info("Found sample post, checking columns...")
            
            # Check that we can access the new columns
            classifications = getattr(sample_post, 'classifications', None)
            primary_classification = getattr(sample_post, 'primary_classification', None)
            classified_at = getattr(sample_post, 'classified_at', None)
            
            logger.info(f"Sample post classifications: {classifications}")
            logger.info(f"Sample post primary_classification: {primary_classification}")
            logger.info(f"Sample post classified_at: {classified_at}")
            
            logger.info("Schema verification complete")
            return True
        else:
            logger.warning("No posts found in database to verify schema")
            return True
    
    except Exception as e:
        logger.error(f"Error verifying database schema: {e}")
        return False

if __name__ == "__main__":
    success = add_classification_columns()
    if success:
        verify_schema()
    else:
        logger.error("Failed to update database schema") 