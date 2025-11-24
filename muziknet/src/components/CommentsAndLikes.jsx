// CommentsAndLikes.jsx
import React, { useState } from "react";

const CommentsAndLikes = ({
  post,
  currentUser,
  handleLike,
  handleComment,
  commentText,
  setCommentText,
  navigate,
  saveScroll
}) => {
  const [expandedComments, setExpandedComments] = useState(false);

  return (
    <div className="mt-4">
      {/* Like + Comment Count Buttons */}
      <div className="flex items-center gap-3 mb-3">
        {/* LIKE BUTTON */}
        <button
          onClick={() => handleLike(post.id)}
          className={`px-3 py-1 rounded ${
            post.likes?.includes(currentUser?.uid)
              ? "bg-blue-600 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          {post.likes?.includes(currentUser?.uid) ? "❤️ Liked" : "♡ Like"} ({post.likes?.length || 0})
        </button>

        {/* COMMENTS BUTTON */}
        <button
          onClick={() => {
            saveScroll();
            navigate(`/user-post/${post.id}`);
          }}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          💬 Comments ({post.comments?.length || 0})
        </button>
      </div>

      {/* Comment Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Write a comment..."
          value={commentText[post.id] || ""}
          onChange={(e) =>
            setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
          }
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={() => handleComment(post.id)}
          className="bg-gray-800 text-white px-3 py-2 rounded"
        >
          Post
        </button>
      </div>

      {/* Preview Comments (last 3) */}
      {post.comments?.length > 0 && (
        <div className="mt-3 text-sm text-gray-700">
          {(expandedComments ? post.comments : post.comments.slice(-3)).map(
            (c, i) => (
              <div key={i}>
                <strong>{c.userName || "Unknown"}:</strong> {c.text}
              </div>
            )
          )}
          {post.comments.length > 3 && (
            <button
              onClick={() => setExpandedComments(!expandedComments)}
              className="text-blue-500 text-xs mt-2"
            >
              {expandedComments ? "Show less" : "View all comments"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentsAndLikes;
