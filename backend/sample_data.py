#!/usr/bin/env python3
"""
Script to populate the databases with sample data for testing purposes.
"""

import os
import sys
import datetime
import random
import sqlite3

# Add parent directory to path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # Try to import SQLAlchemy models directly
    from models.twitter_post import TwitterPost, Base
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    USING_ORM = True
except ImportError:
    USING_ORM = False
    print("Could not import SQLAlchemy models, falling back to direct SQLite")

# Sample Twitter data
SAMPLE_TWEETS = [
    {
        "external_id": "sample1",
        "author_id": "12345",
        "author": "CursorDevTeam",
        "author_name": "Cursor Development Team",
        "profile_image": "https://pbs.twimg.com/profile_images/1234567890/profile.jpg",
        "content": "🎉 Exciting news! Cursor v0.48 is now available with massive improvements to the Claude 3 Opus model. Try it now and experience the future of AI coding.",
        "created_at": datetime.datetime.now() - datetime.timedelta(days=2, hours=random.randint(1, 12)),
        "likes": 89,
        "retweets": 42,
        "replies": 16,
        "url": "https://twitter.com/cursor/status/sample1",
        "media_url": "https://pbs.twimg.com/media/FzUV6XWWYAA5Rts.jpg",
    },
    {
        "external_id": "sample2",
        "author_id": "67890",
        "author": "CodingEnthusiast",
        "author_name": "Coding Enthusiast",
        "profile_image": "https://pbs.twimg.com/profile_images/0987654321/profile.jpg",
        "content": "I've been using @cursor_editor for a week now and my productivity has skyrocketed! The AI completions are mind-blowing. #CursorIDE #AICoding",
        "created_at": datetime.datetime.now() - datetime.timedelta(days=4, hours=random.randint(1, 12)),
        "likes": 65,
        "retweets": 23,
        "replies": 7,
        "url": "https://twitter.com/user1/status/sample2",
        "media_url": "",
    },
    {
        "external_id": "sample3",
        "author_id": "54321",
        "author": "DevToolsReviewer",
        "author_name": "Dev Tools Reviewer",
        "profile_image": "https://pbs.twimg.com/profile_images/1122334455/profile.jpg",
        "content": "Cursor vs VSCode with Copilot: After 2 weeks of testing, Cursor wins for me. The integrated agent and chat features are game changers. Full review coming soon!",
        "created_at": datetime.datetime.now() - datetime.timedelta(days=6, hours=random.randint(1, 12)),
        "likes": 128,
        "retweets": 57,
        "replies": 31,
        "url": "https://twitter.com/user2/status/sample3",
        "media_url": "https://pbs.twimg.com/media/FzTY7zKX0AAyTe1.jpg",
    },
    {
        "external_id": "sample4",
        "author_id": "11223",
        "author": "ProgrammerJane",
        "author_name": "Jane the Programmer",
        "profile_image": "https://pbs.twimg.com/profile_images/6677889900/profile.jpg",
        "content": "Having some issues with Cursor today. The editor keeps freezing when I try to use the AI chat. Anyone else experiencing this? @cursor_support",
        "created_at": datetime.datetime.now() - datetime.timedelta(days=1, hours=random.randint(1, 12)),
        "likes": 12,
        "retweets": 3,
        "replies": 8,
        "url": "https://twitter.com/user3/status/sample4",
        "media_url": "",
    },
    {
        "external_id": "sample5",
        "author_id": "33445",
        "author": "AITechWatcher",
        "author_name": "AI Tech Watcher",
        "profile_image": "https://pbs.twimg.com/profile_images/9988776655/profile.jpg",
        "content": "Just tried the new Claude 3 integration in Cursor. It's incredible how it understands context across files. This is the future of coding assistants.",
        "created_at": datetime.datetime.now() - datetime.timedelta(days=3, hours=random.randint(1, 12)),
        "likes": 75,
        "retweets": 28,
        "replies": 14,
        "url": "https://twitter.com/user4/status/sample5",
        "media_url": "",
    },
    {
        "external_id": "sample6",
        "author_id": "99887",
        "author": "CursorTips",
        "author_name": "Cursor Tips & Tricks",
        "profile_image": "https://pbs.twimg.com/profile_images/5544332211/profile.jpg",
        "content": "Pro tip for Cursor users: Use Ctrl+K to quickly access AI commands. Works in any file and context! #CursorTips #ProductivityHacks",
        "created_at": datetime.datetime.now() - datetime.timedelta(days=5, hours=random.randint(1, 12)),
        "likes": 45,
        "retweets": 19,
        "replies": 5,
        "url": "https://twitter.com/user5/status/sample6",
        "media_url": "https://pbs.twimg.com/media/FzSX6WkWYAAiQt4.jpg",
    }
]

def populate_twitter_data():
    """Populate the Twitter database with sample data."""
    print("Adding sample Twitter data...")
    
    if USING_ORM:
        # Use SQLAlchemy ORM
        try:
            # Create engine and session
            engine = create_engine("sqlite:///twitter_posts.db")
            Base.metadata.create_all(engine)
            Session = sessionmaker(bind=engine)
            session = Session()
            
            # Add sample tweets
            for tweet_data in SAMPLE_TWEETS:
                # Check if tweet already exists
                existing = session.query(TwitterPost).filter_by(external_id=tweet_data["external_id"]).first()
                if existing:
                    print(f"Tweet {tweet_data['external_id']} already exists, skipping")
                    continue
                    
                # Create new TwitterPost instance
                tweet = TwitterPost(**tweet_data)
                session.add(tweet)
                
            # Commit changes
            session.commit()
            session.close()
            print(f"Added {len(SAMPLE_TWEETS)} sample tweets to the database using SQLAlchemy ORM.")
            
        except Exception as e:
            print(f"Error using SQLAlchemy ORM: {e}")
            print("Falling back to direct SQLite...")
            populate_using_sqlite()
    else:
        # Use direct SQLite
        populate_using_sqlite()

def populate_using_sqlite():
    """Use direct SQLite connection to add sample data."""
    try:
        # Connect to the database
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'twitter_posts.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS twitter_posts (
            id INTEGER PRIMARY KEY,
            external_id TEXT UNIQUE,
            author_id TEXT NOT NULL,
            author TEXT NOT NULL,
            author_name TEXT,
            profile_image TEXT,
            media_url TEXT,
            content TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            url TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            retweets INTEGER DEFAULT 0,
            replies INTEGER DEFAULT 0,
            subreddit TEXT DEFAULT 'twitter',
            source TEXT DEFAULT 'twitter',
            created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Insert sample data
        added_count = 0
        for tweet in SAMPLE_TWEETS:
            tweet_id = tweet['external_id']
            created_at = tweet['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            
            # Check if tweet already exists
            cursor.execute("SELECT 1 FROM twitter_posts WHERE external_id = ?", (tweet_id,))
            if cursor.fetchone():
                print(f"Tweet {tweet_id} already exists in database, skipping")
                continue
            
            cursor.execute('''
            INSERT INTO twitter_posts 
            (external_id, author_id, author, author_name, profile_image, media_url, content, created_at, url, likes, retweets, replies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                tweet_id,
                tweet['author_id'],
                tweet['author'],
                tweet['author_name'],
                tweet['profile_image'],
                tweet['media_url'],
                tweet['content'],
                created_at,
                tweet['url'],
                tweet['likes'],
                tweet['retweets'],
                tweet['replies']
            ))
            added_count += 1
        
        # Commit and close
        conn.commit()
        conn.close()
        
        print(f"Added {added_count} sample tweets to the database using SQLite.")
        
    except Exception as e:
        print(f"Error with SQLite: {e}")

if __name__ == "__main__":
    populate_twitter_data()
    print("Sample data population complete!") 