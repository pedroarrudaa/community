#!/usr/bin/env python3
"""
Simple API server for Community Surf
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import twitter_db

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all routes
CORS(app)

@app.route('/')
def hello():
    return jsonify({"status": "ok", "message": "Community Surf API is running!"})

@app.route('/api/tweets/search', methods=['GET'])
def search_tweets():
    """
    Search tweets from the database
    Parameters:
    - query (str): Search query
    - sort (str): Sort order (new, top, hot)
    Returns:
    - JSON response with tweets
    """
    query = request.args.get('query', '')
    sort_by = request.args.get('sort', 'new')
    
    logger.info(f"Searching tweets for query: '{query}', sort: {sort_by}")
    
    try:
        # Get all tweets from the local database
        all_tweets = twitter_db.get_all_tweets(sort_by=sort_by)
        
        # If we have tweets and a query, filter them
        if all_tweets and query:
            filtered_tweets = [t for t in all_tweets if query.lower() in t.get('content', '').lower()]
            logger.info(f"Found {len(filtered_tweets)} tweets in local database matching query: '{query}'")
            return jsonify({
                "posts": filtered_tweets,
                "source": "local_db",
                "total": len(filtered_tweets)
            })
        
        # If we have tweets and no query, return all
        elif all_tweets:
            logger.info(f"Returning all {len(all_tweets)} tweets from local database")
            return jsonify({
                "posts": all_tweets,
                "source": "local_db",
                "total": len(all_tweets)
            })
    except Exception as e:
        logger.error(f"Error retrieving tweets from local database: {e}")
    
    # If we have a query but no results, return an empty list
    return jsonify({
        "posts": [],
        "source": "local_db",
        "total": 0,
        "message": f"No tweets found for query: '{query}'"
    })

@app.route('/api/tweets/recent', methods=['GET'])
def get_recent_tweets():
    """Get recent tweets"""
    limit = request.args.get('limit', 20, type=int)
    try:
        tweets = twitter_db.get_all_tweets(limit=limit, sort_by='new')
        return jsonify({
            "posts": tweets,
            "total": len(tweets)
        })
    except Exception as e:
        logger.error(f"Error retrieving recent tweets: {e}")
        return jsonify({
            "posts": [],
            "total": 0,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Make sure the database exists
    twitter_db.setup_database()
    
    # Run the Flask app
    app.run(host="0.0.0.0", port=5001, debug=True) 