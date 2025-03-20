import sqlite3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_schema():
    """Add media_url column to twitter_posts table if it doesn't exist"""
    try:
        # Connect to the database
        conn = sqlite3.connect('twitter_posts.db')
        cursor = conn.cursor()
        
        # Check if media_url column exists
        cursor.execute("PRAGMA table_info(twitter_posts)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'media_url' not in columns:
            logger.info("Adding media_url column to twitter_posts table")
            cursor.execute("ALTER TABLE twitter_posts ADD COLUMN media_url VARCHAR(255)")
            conn.commit()
            logger.info("Schema updated successfully")
        else:
            logger.info("media_url column already exists")
        
        # Close the connection
        conn.close()
        
        return True
    except Exception as e:
        logger.error(f"Error updating schema: {str(e)}")
        return False

if __name__ == "__main__":
    update_schema() 