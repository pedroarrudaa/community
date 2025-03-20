import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if OpenAI package is available
try:
    import openai
    openai_version = getattr(openai, "__version__", "unknown")
    logger.info(f"OpenAI package is available (version: {openai_version})")
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI package not installed. Run 'pip install openai' to enable classification.")
    OPENAI_AVAILABLE = False

# Classification categories
CATEGORIES = {
    "positive_feedback": "🟢 Positive Feedback",
    "frustration": "🔴 Frustration",
    "bug_report": "🐛 Bug Report",
    "feature_suggestion": "🎯 Feature Suggestion",
    "trending_topic": "🔥 Trending Topic",
    "question": "❓ Question",
    "neutral": "⚪ Neutral"
}

class LLMClassifier:
    """
    Classifies posts using LLM API (GPT-4 or equivalent)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the classifier with API key
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        
        if OPENAI_AVAILABLE and self.api_key:
            try:
                # Set API key for older OpenAI API versions
                openai.api_key = self.api_key
                logger.info("OpenAI initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing OpenAI: {e}")
        else:
            if not OPENAI_AVAILABLE:
                logger.warning("LLM classification unavailable: OpenAI package not installed")
            elif not self.api_key:
                logger.warning("LLM classification unavailable: API key missing")
            else:
                logger.warning("LLM classification unavailable: Unknown reason")
    
    def is_available(self) -> bool:
        """
        Check if the classifier is available
        """
        available = OPENAI_AVAILABLE and self.api_key is not None
        logger.info(f"LLM classifier availability check: {available}")
        return available
    
    def classify_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify a single post and return the classifications
        """
        post_id = post.get('id', 'unknown')
        
        # If already classified and has valid classifications, return as is
        existing_classifications = post.get('classifications', [])
        if existing_classifications and isinstance(existing_classifications, list) and len(existing_classifications) > 0:
            logger.info(f"Post {post_id} already classified as: {existing_classifications}")
            return post
            
        if not self.is_available():
            logger.warning(f"Cannot classify post {post_id}: LLM not available")
            return self._generate_fallback_classification(post)
        
        try:
            # Extract relevant content from post
            title = post.get('title', '')
            content = post.get('content', '')
            
            logger.info(f"Classifying post {post_id}: '{title[:50]}...'")
            
            # Prepare prompt for classification
            prompt = self._build_classification_prompt(title, content)
            
            # Call OpenAI API
            try:
                logger.info(f"Calling OpenAI API for post {post_id}")
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",  # Use an available model
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that analyzes and classifies community posts."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,  # Low temperature for consistent classification
                    max_tokens=500
                )
                
                # Parse the response
                classification_text = response.choices[0].message.content
                classifications = self._parse_classification_response(classification_text)
                
                logger.info(f"Successfully classified post {post_id} as: {classifications}")
                
                # Add classifications to post
                return {
                    **post,
                    "classifications": classifications,
                    "primary_classification": classifications[0] if classifications else "neutral",
                    "classified_at": datetime.utcnow().isoformat()
                }
            except AttributeError:
                # Try alternative API (older OpenAI versions)
                logger.info(f"Trying alternative OpenAI API call for post {post_id}")
                response = openai.Completion.create(
                    model="text-davinci-003",
                    prompt=prompt,
                    temperature=0.1,
                    max_tokens=500
                )
                
                classification_text = response.choices[0].text
                classifications = self._parse_classification_response(classification_text)
                
                logger.info(f"Successfully classified post {post_id} with alternative API: {classifications}")
                
                return {
                    **post,
                    "classifications": classifications,
                    "primary_classification": classifications[0] if classifications else "neutral",
                    "classified_at": datetime.utcnow().isoformat()
                }
            
        except Exception as e:
            logger.error(f"Error classifying post {post_id}: {e}")
            logger.error(traceback.format_exc())
            return self._generate_fallback_classification(post)
    
    def classify_posts(self, posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Classify a batch of posts
        """
        classified_posts = []
        
        for post in posts:
            classified_post = self.classify_post(post)
            classified_posts.append(classified_post)
        
        return classified_posts
    
    def _build_classification_prompt(self, title: str, content: str) -> str:
        """
        Build a prompt for classifying the post
        """
        return f"""
        Please analyze the following post and classify it into one or more of these categories:
        
        - positive_feedback: Post contains positive feedback about the product/service
        - frustration: Post expresses frustration or negative sentiment
        - bug_report: Post describes a bug or technical issue
        - feature_suggestion: Post suggests a new feature or improvement
        - trending_topic: Post discusses a trending topic in the community
        - question: Post asks a question seeking help or information
        - neutral: Post doesn't fit into any of the above categories
        
        Post title: {title}
        
        Post content: {content}
        
        Respond with a JSON array of classification strings, with the most relevant classification first.
        Example: ["bug_report", "frustration"]
        
        Only include categories that clearly apply to this post.
        """
    
    def _parse_classification_response(self, response_text: str) -> List[str]:
        """
        Parse the classification response from the LLM
        """
        try:
            # Extract JSON array from response
            if "[" in response_text and "]" in response_text:
                start_idx = response_text.find("[")
                end_idx = response_text.rfind("]") + 1
                json_str = response_text[start_idx:end_idx]
                
                # Parse the JSON array
                classifications = json.loads(json_str)
                
                # Validate classifications
                valid_classifications = [c for c in classifications if c in CATEGORIES]
                
                return valid_classifications if valid_classifications else ["neutral"]
            else:
                logger.warning("Invalid classification response format")
                return ["neutral"]
        except json.JSONDecodeError:
            logger.error(f"Failed to parse classification response: {response_text}")
            return ["neutral"]
        except Exception as e:
            logger.error(f"Error parsing classification: {e}")
            return ["neutral"]
    
    def _generate_fallback_classification(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a fallback classification when LLM is unavailable
        """
        # Use existing sentiment_label if available
        sentiment_label = post.get('sentiment_label', 'neutral')
        
        # Map sentiment label to a classification
        if sentiment_label == 'positive':
            classification = "positive_feedback"
        elif sentiment_label == 'negative':
            classification = "frustration"
        else:
            classification = "neutral"
        
        return {
            **post,
            "classifications": [classification],
            "primary_classification": classification,
            "classified_at": datetime.utcnow().isoformat(),
            "classification_method": "fallback"
        }

# Create a singleton instance
classifier = LLMClassifier()

def get_classifier(api_key: Optional[str] = None) -> LLMClassifier:
    """
    Get the LLM classifier instance
    """
    global classifier
    
    if api_key and classifier.api_key != api_key:
        classifier = LLMClassifier(api_key)
    
    return classifier 