import React from 'react';
import PostCard from './PostCard';
import './PostList.css';

const PostList = ({ posts, onNextPost, onPrevPost }) => {
  if (!posts || posts.length === 0) {
    return <div className="no-posts">No posts found. Try selecting a different subreddit.</div>;
  }

  return (
    <div className="post-list">
      {posts.map(post => (
        <PostCard 
          key={post.id} 
          post={post} 
          onNextPost={onNextPost}
          onPrevPost={onPrevPost}
        />
      ))}
    </div>
  );
};

export default PostList; 